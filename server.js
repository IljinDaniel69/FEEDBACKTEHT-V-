import express from "express";
import session from "express-session";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("Include/styles"));
app.set("view engine", "ejs");

const dbHost = "localhost";
const dbName = "feedback_support";
const dbUser = "root";
const dbPwd = "";

app.set("view engine", "ejs");
app.use("/inc", express.static("includes"));
app.use(express.urlencoded({ extended: true })); // Ensure this line is correct

// middleware
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Vaihda true, jos ite käytät HTTPS
  })
);

// Middleware: Vain kirjautuneet adminit pääsevät eteenpäin
const requireLogin = (req, res, next) => {
  if (!req.session.user || !req.session.user.admin) {
    return res.redirect("/");
  }
  next();
};

// Etusivu: kirjaudu
app.get("/", (req, res) => {
  res.render("login", { message: "" });
});

// Kirjautumisen käsittely
app.post("/login", async (req, res) => {
  const { identifier, password } = req.body; // ID or email and password
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [users] = await connection.execute(
      "SELECT id, fullname, email, password, admin FROM system_user WHERE id = ? OR email = ?",
      [identifier, identifier]
    );

    if (users.length === 0 || !users[0].admin) {
      return res.render("login", {
        message: "Väärät tunnukset tai ei admin-oikeuksia!",
      });
    }

    const match = await bcrypt.compare(password, users[0].password);
    if (!match) {
      return res.render("login", {
        message: "Väärä salasana!",
      });
    }

    req.session.user = {
      id: users[0].id,
      fullname: users[0].fullname,
      admin: users[0].admin,
    };
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Kirjautuminen epäonnistunut!");
  } finally {
    if (connection) await connection.end();
  }
});

// Dashboard ainoastaan adminit
app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", { fullname: req.session.user.fullname });
});

// Logout kirjaudu ulos
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

// Asiakkaiden lista (vain adminit)
app.get("/customers", requireLogin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [customers] = await connection.execute("SELECT * FROM customer");
    const [users] = await connection.execute("SELECT * FROM system_user");

    res.render("customer", { customers, users });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

// Tukipyynnön tiedot (vain adminit)
app.get("/support/:id", requireLogin, async (req, res) => {
  const id = req.params.id;
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [tickets] = await connection.execute(
      "SELECT support_ticket.id, customer.name, support_ticket.arrived, support_ticket.description, ticket_status.description as status FROM support_ticket JOIN ticket_status ON support_ticket.status = ticket_status.id JOIN customer ON support_ticket.customer_id = customer.id WHERE support_ticket.id = ?",
      [id]
    );

    const [messages] = await connection.execute(
      "SELECT support_message.id, system_user.fullname, support_message.body, created_at FROM support_message JOIN system_user ON support_message.from_user = system_user.id WHERE support_message.ticket_id = ?",
      [id]
    );

    res.render("supportticket", { ticket: tickets[0], messages });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

// Tukiviestin lisääminen (vain adminit)
app.post("/supportticket/:id/reply", requireLogin, async (req, res) => {
  const id = req.params.id;
  const message = req.body.message;
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const sql =
      "SELECT id, fullname, password FROM system_user WHERE (id = ? OR email = ?) AND admin = 0";
    const [users] = await connection.execute(sql, [userid, userid]);

    await connection.execute(
      "INSERT INTO support_message(created_at, ticket_id, from_user, body) VALUES(NOW(), ?, ?, ?)",
      [id, req.session.user.id, message]
    );

    res.redirect("/support/" + id);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

app.post("/support/:id/status", requireLogin, async (req, res) => {
  const id = req.params.id;
  const status = req.body.status;
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    await connection.execute(
      "UPDATE  support_ticket SET status = ? WHERE id = ?",
      [status, id]
    );

    res.redirect("/support/" + id);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

// Tukipyynnöt (vain adminit)
app.get("/tickets", requireLogin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [tickets] = await connection.execute("SELECT * FROM support_ticket");

    res.render("support", { tickets });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

// Palaute (vain adminit)
app.get("/feedback", requireLogin, async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPwd,
      database: dbName,
    });

    const [feedback] = await connection.execute(
      "SELECT feedback.id, system_user.fullname, guest_name, feedback, handled, from_user FROM feedback LEFT JOIN system_user ON from_user = system_user.id"
    );

    res.render("feedback", { feedback });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) await connection.end();
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
