(() => {
  const USERS_KEY = "ebuy_users";
  const LEGACY_USER_KEY = "ebuy_user";

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function hasSameIdentity(users, account) {
    const username = normalize(account.username);
    const email = normalize(account.email);
    return users.some(
      (user) =>
        (username && normalize(user.username) === username) ||
        (email && normalize(user.email) === email),
    );
  }

  function readUsers() {
    let users = [];
    try {
      const savedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      if (Array.isArray(savedUsers)) {
        users = savedUsers.filter(
          (user) => user && typeof user === "object" && !Array.isArray(user),
        );
      }
    } catch {
      users = [];
    }

    try {
      const legacyUser = JSON.parse(localStorage.getItem(LEGACY_USER_KEY));
      if (
        legacyUser &&
        typeof legacyUser === "object" &&
        !Array.isArray(legacyUser) &&
        !hasSameIdentity(users, legacyUser)
      ) {
        users.push(legacyUser);
      }
    } catch {
    }

    return users;
  }

  function saveUser(account) {
    const users = readUsers();
    const username = normalize(account.username);
    const email = normalize(account.email);
    const existingIndex = users.findIndex(
      (user) =>
        (username && normalize(user.username) === username) ||
        (email && normalize(user.email) === email),
    );

    if (existingIndex === -1) users.push(account);
    else users[existingIndex] = account;

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(account));
  }

  window.eBuyAccounts = { normalize, readUsers, saveUser };
})();