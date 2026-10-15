/**
 * Create or reset an account directly in the DB (there is no public registration).
 *
 *   npm run create-user -- --username gabor --email me@example.com --role admin
 *   npm run create-user -- --username gabor --reset              (new password, keeps role)
 *   npm run create-user -- --username gabor --reset --role user  (also change the role)
 *
 * The password is asked for in the terminal and never echoed or passed as an argument
 * (arguments end up in shell history). Uses BackEnd/.env for the DB connection.
 */
const { parseArgs } = require("util");
const readline = require("readline");

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "user"];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Reads a line from the terminal without echoing it */
function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);

    if (!process.stdin.isTTY) {
      // Piped input (e.g. scripts): read one line normally
      const rl = readline.createInterface({ input: process.stdin });
      rl.once("line", (line) => {
        rl.close();
        resolve(line);
      });
      return;
    }

    let value = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chars) => {
      for (const char of chars) {
        if (char === "\r" || char === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130); // Ctrl+C
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1); // Backspace
        } else {
          value += char;
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      username: { type: "string" },
      email: { type: "string" },
      role: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  });

  if (!args.username || !USERNAME_PATTERN.test(args.username)) {
    fail("--username is required: 3-32 letters, digits or underscores");
  }
  if (args.role !== undefined && !ROLES.includes(args.role)) {
    fail(`--role must be one of: ${ROLES.join(", ")}`);
  }
  if (args.email !== undefined && !EMAIL_PATTERN.test(args.email)) {
    fail("--email is not a valid email address");
  }

  // Required lazily so argument errors don't need a DB connection
  const db = require("../src/config/db.config");
  const User = require("../src/models/user.model");

  try {
    const existing = await User.findByUsername(args.username);
    if (existing && !args.reset) fail(`User "${args.username}" already exists (use --reset to change the password)`);
    if (!existing && args.reset) fail(`User "${args.username}" doesn't exist`);
    if (!existing && !args.email) fail("--email is required when creating a user");

    const password = await askHidden("Password (12-128 characters): ");
    if (password.length < 12 || password.length > 128) fail("Password must be 12-128 characters");
    const confirmation = await askHidden("Repeat password: ");
    if (password !== confirmation) fail("Passwords don't match");

    if (existing) {
      const changes = { password };
      if (args.role) changes.role = args.role;
      if (args.email) changes.email = args.email;
      await User.update(existing.id, changes);
      console.log(`✓ Updated "${args.username}"${args.role ? ` (role: ${args.role})` : ""}`);
    } else {
      if (await User.findByEmail(args.email)) fail("That email is already used by another account");
      const role = args.role || "user";
      const { id } = await User.create({ username: args.username, email: args.email, password, role });
      console.log(`✓ Created "${args.username}" (id ${id}, role: ${role})`);
    }
  } finally {
    await db.pool.end();
  }
}

main().catch((error) => {
  console.error("✗", error.message);
  process.exit(1);
});
