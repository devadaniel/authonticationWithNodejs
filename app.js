const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const checkUsername = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(checkUsername);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
         user( username, name, password, gender, location)
      VALUES
        (
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );
      `;
    if (password.length > 4) {
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const comparedPassword = await bcrypt.compare(password, dbUser.password);
    if (comparedPassword === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserName = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserName);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length > 4) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
              UPDATE 
                user
              SET 
                password = '${hashedPassword}'
              WHERE 
                username = '${username}';
              `;
        const user = await db.run(updatePassword);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
