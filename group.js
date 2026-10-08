(() => {
  const GROUPS_KEY = "eBuyGroups";
  const currentUser = localStorage.getItem("currentuser");
  const currentDisplayName =
    localStorage.getItem("currentdisplayname") || currentUser;
  const statusElement = document.getElementById("groupStatus");

  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("displayuser").textContent = currentDisplayName;
  document.getElementById("btnlogout").addEventListener("click", () => {
    localStorage.removeItem("currentuser");
    localStorage.removeItem("currentrole");
    localStorage.removeItem("currentdisplayname");
  });

  let groups;
  let selectedGroupId = null;

  function showStatus(message, type = "success") {
    statusElement.textContent = message;
    statusElement.className = `alert alert-${type}`;
  }

  function clearStatus() {
    statusElement.textContent = "";
    statusElement.className = "alert d-none";
  }

  function readGroups() {
    const savedGroups = localStorage.getItem(GROUPS_KEY);
    if (!savedGroups) return [];
    const parsedGroups = JSON.parse(savedGroups);
    if (!Array.isArray(parsedGroups)) {
      throw new Error("Saved group data is not in the expected format.");
    }
    return parsedGroups;
  }

  function saveGroups(nextGroups) {
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(nextGroups));
      groups = nextGroups;
      clearStatus();
      return true;
    } catch (error) {
      showStatus(
        `Could not save group changes: ${error.message || "browser storage is unavailable."}`,
        "danger",
      );
      return false;
    }
  }

  function makeId() {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function sameUser(first, second) {
    return String(first).toLowerCase() === String(second).toLowerCase();
  }

  function isMember(group) {
    return group.members.some((member) => sameUser(member, currentUser));
  }

  function isOwner(group) {
    return sameUser(group.owner, currentUser);
  }

  function getDisplayName(username) {
    if (sameUser(username, currentUser)) return currentDisplayName;
    const account = window.eBuyAccounts
      ?.readUsers()
      .find((user) => sameUser(user.username, username));
    return account?.displayName || username;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function isHttpUrl(value) {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  function renderDirectory() {
    const directory = document.getElementById("groupDirectory");
    const query = document
      .getElementById("groupSearch")
      .value.trim()
      .toLowerCase();
    const visibleGroups = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query),
    );
    directory.replaceChildren();
    document.getElementById("groupCount").textContent = String(groups.length);

    if (visibleGroups.length === 0) {
      directory.appendChild(
        createElement(
          "p",
          "group-directory-empty",
          groups.length ? "No groups match your search." : "No groups yet. Create the first one!",
        ),
      );
      return;
    }

    visibleGroups.forEach((group) => {
      const card = createElement(
        "article",
        `group-card${group.id === selectedGroupId ? " is-selected" : ""}`,
      );
      const topRow = createElement("div", "group-card-top");
      const icon = createElement("span", "group-card-icon");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<i class="bi bi-people-fill"></i>';
      const name = createElement("h3", "group-card-name", group.name);
      topRow.append(icon, name);

      const description = createElement(
        "p",
        "group-card-description",
        group.description || "A new eBuy community.",
      );
      const meta = createElement("div", "group-card-meta");
      const members = createElement(
        "span",
        "",
        `${group.members.length} ${group.members.length === 1 ? "member" : "members"}`,
      );
      const policy = createElement(
        "span",
        "group-policy",
        group.joinPolicy === "approval" ? "Approval required" : "Open",
      );
      meta.append(members, policy);

      const actions = createElement("div", "group-card-actions");
      const openButton = createElement(
        "button",
        "btn btn-sm btn-outline-secondary",
        group.id === selectedGroupId ? "Selected" : "Details",
      );
      openButton.type = "button";
      openButton.dataset.groupAction = "open";
      openButton.dataset.groupId = group.id;
      openButton.setAttribute(
        "aria-pressed",
        String(group.id === selectedGroupId),
      );
      actions.appendChild(openButton);

      if (!isMember(group)) {
        const requested = group.requests.some((request) =>
          sameUser(request, currentUser),
        );
        const joinButton = createElement(
          "button",
          requested
            ? "btn btn-sm btn-outline-secondary"
            : "btn btn-sm btn-primary",
          requested
            ? "Cancel request"
            : group.joinPolicy === "approval"
              ? "Request to join"
              : "Join group",
        );
        joinButton.type = "button";
        joinButton.dataset.groupAction = requested
          ? "cancel-request"
          : group.joinPolicy === "approval"
            ? "request"
            : "join";
        joinButton.dataset.groupId = group.id;
        actions.appendChild(joinButton);
      }

      card.append(topRow, description, meta, actions);
      directory.appendChild(card);
    });
  }

  function renderEmptyDetails(title, description) {
    const details = document.getElementById("groupDetails");
    const empty = createElement("div", "group-empty-state");
    const icon = createElement("span");
    icon.innerHTML = '<i class="bi bi-chat-square-heart"></i>';
    empty.append(
      icon,
      createElement("h2", "", title),
      createElement("p", "", description),
    );
    details.replaceChildren(empty);
  }

  function renderRequests(group, container) {
    const requestSection = createElement("section", "group-requests");
    const heading = createElement("div", "group-requests-heading");
    heading.append(
      createElement("h3", "", "Join requests"),
      createElement("span", "group-count", String(group.requests.length)),
    );
    requestSection.appendChild(heading);

    if (group.requests.length === 0) {
      requestSection.appendChild(
        createElement("p", "group-muted mb-0", "There are no pending requests."),
      );
    } else {
      const requestList = createElement("div", "group-request-list");
      group.requests.forEach((request) => {
        const row = createElement("div", "group-request-row");
        row.appendChild(
          createElement("span", "", getDisplayName(request.username)),
        );
        const actions = createElement("div", "d-flex gap-2");
        ["approve", "reject"].forEach((action) => {
          const button = createElement(
            "button",
            action === "approve"
              ? "btn btn-sm btn-primary"
              : "btn btn-sm btn-outline-secondary",
            action === "approve" ? "Approve" : "Decline",
          );
          button.type = "button";
          button.dataset.groupAction = action;
          button.dataset.groupId = group.id;
          button.dataset.username = request.username;
          actions.appendChild(button);
        });
        row.appendChild(actions);
        requestList.appendChild(row);
      });
      requestSection.appendChild(requestList);
    }
    container.appendChild(requestSection);
  }

  function renderChat(group, container) {
    const chat = createElement("section", "group-chat");
    const memberToolbar = createElement("div", "group-member-toolbar");
    const memberList = createElement("div", "group-member-list");
    group.members.forEach((member) => {
      const chip = createElement(
        "span",
        "group-member-chip",
        getDisplayName(member),
      );
      if (sameUser(member, group.owner)) {
        chip.appendChild(createElement("span", "group-owner-tag", "Leader"));
      }
      memberList.appendChild(chip);
    });
    memberToolbar.appendChild(memberList);

    if (!isOwner(group)) {
      const leaveButton = createElement(
        "button",
        "btn btn-sm btn-outline-secondary",
        "Leave group",
      );
      leaveButton.type = "button";
      leaveButton.dataset.groupAction = "leave";
      leaveButton.dataset.groupId = group.id;
      memberToolbar.appendChild(leaveButton);
    }

    const messages = createElement("div", "group-messages");
    messages.setAttribute("role", "log");
    messages.setAttribute("aria-label", `${group.name} messages`);
    if (group.messages.length === 0) {
      messages.appendChild(
        createElement(
          "p",
          "group-chat-empty",
          "No messages yet. Say hello to the group!",
        ),
      );
    } else {
      group.messages.forEach((message) => {
        const bubble = createElement(
          `article`,
          `group-message${sameUser(message.username, currentUser) ? " is-mine" : ""}`,
        );
        const messageHeader = createElement("div", "group-message-header");
        messageHeader.append(
          createElement(
            "strong",
            "",
            message.displayName || getDisplayName(message.username),
          ),
          createElement(
            "time",
            "",
            new Date(message.createdAt).toLocaleString(),
          ),
        );
        bubble.appendChild(messageHeader);
        if (message.text) {
          bubble.appendChild(createElement("p", "group-message-text", message.text));
        }
        if (message.imageUrl) {
          const image = createElement("img", "group-message-image");
          image.src = message.imageUrl;
          image.alt = "Image shared in the group";
          image.loading = "lazy";
          image.addEventListener("error", () => image.remove(), { once: true });
          bubble.appendChild(image);
        }
        messages.appendChild(bubble);
      });
    }

    const messageForm = createElement("form", "group-message-form");
    messageForm.id = "groupMessageForm";
    messageForm.dataset.groupId = group.id;
    const textLabel = createElement("label", "form-label", "Message");
    textLabel.htmlFor = "groupMessageText";
    const textArea = createElement("textarea", "form-control");
    textArea.id = "groupMessageText";
    textArea.name = "message";
    textArea.rows = 2;
    textArea.maxLength = 1000;
    textArea.placeholder = "Write a message...";
    const imageLabel = createElement(
      "label",
      "form-label mt-3",
      "Image URL (optional)",
    );
    imageLabel.htmlFor = "groupImageUrl";
    const imageInput = createElement("input", "form-control");
    imageInput.id = "groupImageUrl";
    imageInput.name = "imageUrl";
    imageInput.type = "url";
    imageInput.placeholder = "https://example.com/photo.jpg";
    const sendButton = createElement(
      "button",
      "btn btn-primary mt-3",
      "Send message",
    );
    sendButton.type = "submit";
    messageForm.append(
      textLabel,
      textArea,
      imageLabel,
      imageInput,
      sendButton,
    );
    chat.append(memberToolbar, messages, messageForm);
    container.appendChild(chat);
    messages.scrollTop = messages.scrollHeight;
  }

  function renderDetails() {
    const group = groups.find((item) => item.id === selectedGroupId);
    if (!group) {
      renderEmptyDetails(
        "Choose a group to get started",
        "Create a group or select one from the list to see its details.",
      );
      return;
    }

    const details = document.getElementById("groupDetails");
    details.replaceChildren();
    const header = createElement("header", "group-detail-heading");
    const copy = createElement("div");
    copy.append(
      createElement("span", "group-section-kicker", "GROUP"),
      createElement("h2", "", group.name),
      createElement(
        "p",
        "group-detail-description",
        group.description || "A new eBuy community.",
      ),
    );
    const policy = createElement(
      "span",
      "group-policy",
      group.joinPolicy === "approval" ? "Approval required" : "Open group",
    );
    header.append(copy, policy);
    details.appendChild(header);

    if (isOwner(group)) renderRequests(group, details);

    if (!isMember(group)) {
      const joinPanel = createElement("div", "group-join-prompt");
      joinPanel.appendChild(
        createElement(
          "p",
          "",
          group.joinPolicy === "approval"
            ? "Ask the group leader to approve your request to join."
            : "Join this group to see messages and chat with its members.",
        ),
      );
      const requested = group.requests.some((request) =>
        sameUser(request.username, currentUser),
      );
      const joinButton = createElement(
        "button",
        requested ? "btn btn-outline-secondary" : "btn btn-primary",
        requested
          ? "Cancel request"
          : group.joinPolicy === "approval"
            ? "Request to join"
            : "Join group",
      );
      joinButton.type = "button";
      joinButton.dataset.groupAction = requested
        ? "cancel-request"
        : group.joinPolicy === "approval"
          ? "request"
          : "join";
      joinButton.dataset.groupId = group.id;
      joinPanel.appendChild(joinButton);
      details.appendChild(joinPanel);
      return;
    }

    renderChat(group, details);
  }

  function render() {
    renderDirectory();
    renderDetails();
  }

  function updateGroup(groupId, update) {
    const nextGroups = groups.map((group) =>
      group.id === groupId ? update(group) : group,
    );
    return saveGroups(nextGroups);
  }

  document
    .getElementById("createGroupForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("groupName").value.trim();
      const description = document
        .getElementById("groupDescription")
        .value.trim();
      const joinPolicy = document.getElementById("groupJoinPolicy").value;
      if (!name) {
        showStatus("Enter a name for your group.", "danger");
        return;
      }

      const group = {
        id: makeId(),
        name,
        description,
        owner: currentUser,
        joinPolicy,
        members: [currentUser],
        requests: [],
        messages: [],
        createdAt: new Date().toISOString(),
      };
      if (!saveGroups([group, ...groups])) return;
      selectedGroupId = group.id;
      event.currentTarget.reset();
      render();
      showStatus(`“${name}” was created. You are the group leader.`);
    });

  document.getElementById("groupSearch").addEventListener("input", renderDirectory);

  document
    .getElementById("groupDirectory")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-group-action]");
      if (!button) return;
      const { groupAction: action, groupId } = button.dataset;
      const group = groups.find((item) => item.id === groupId);
      if (!group) return;

      if (action === "open") {
        selectedGroupId = groupId;
        render();
        return;
      }
      if (action === "join") {
        if (!isMember(group) && group.joinPolicy === "open") {
          if (
            updateGroup(groupId, (item) => ({
              ...item,
              members: [...item.members, currentUser],
            }))
          ) {
            selectedGroupId = groupId;
            render();
            showStatus(`You joined “${group.name}”.`);
          }
        }
        return;
      }
      if (action === "request" || action === "cancel-request") {
        if (isMember(group)) return;
        const requests = group.requests.filter(
          (request) => !sameUser(request.username, currentUser),
        );
        if (action === "request") requests.push({ username: currentUser });
        if (updateGroup(groupId, (item) => ({ ...item, requests }))) {
          render();
          showStatus(
            action === "request"
              ? `Your request to join “${group.name}” was sent.`
              : "Your join request was canceled.",
          );
        }
      }
    });

  document
    .getElementById("groupDetails")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-group-action]");
      if (!button) return;
      const { groupAction: action, groupId, username } = button.dataset;
      const group = groups.find((item) => item.id === groupId);
      if (!group) return;

      if (action === "join" && group.joinPolicy === "open" && !isMember(group)) {
        if (
          updateGroup(groupId, (item) => ({
            ...item,
            members: [...item.members, currentUser],
          }))
        ) {
          render();
          showStatus(`You joined “${group.name}”.`);
        }
      } else if (action === "request" && !isMember(group)) {
        const requests = group.requests.some((request) =>
          sameUser(request.username, currentUser),
        )
          ? group.requests
          : [...group.requests, { username: currentUser }];
        if (updateGroup(groupId, (item) => ({ ...item, requests }))) {
          render();
          showStatus(`Your request to join “${group.name}” was sent.`);
        }
      } else if (
        action === "cancel-request" &&
        !isMember(group)
      ) {
        const requests = group.requests.filter(
          (request) => !sameUser(request.username, currentUser),
        );
        if (updateGroup(groupId, (item) => ({ ...item, requests }))) {
          render();
          showStatus("Your join request was canceled.");
        }
      } else if (action === "approve" || action === "reject") {
        if (!isOwner(group)) return;
        const requests = group.requests.filter((request) =>
          sameUser(request.username, username),
        );
        if (requests.length === 0) return;
        const nextRequests = group.requests.filter(
          (request) => !sameUser(request.username, username),
        );
        const members =
          action === "approve" &&
          !group.members.some((member) => sameUser(member, username))
            ? [...group.members, username]
            : group.members;
        if (
          updateGroup(groupId, (item) => ({
            ...item,
            members,
            requests: nextRequests,
          }))
        ) {
          render();
          showStatus(
            action === "approve"
              ? `${getDisplayName(username)} joined the group.`
              : "The join request was declined.",
          );
        }
      } else if (action === "leave" && isMember(group) && !isOwner(group)) {
        if (
          updateGroup(groupId, (item) => ({
            ...item,
            members: item.members.filter(
              (member) => !sameUser(member, currentUser),
            ),
          }))
        ) {
          render();
          showStatus(`You left “${group.name}”.`);
        }
      }
    });

  document
    .getElementById("groupDetails")
    .addEventListener("submit", (event) => {
      if (event.target.id !== "groupMessageForm") return;
      event.preventDefault();
      const group = groups.find(
        (item) => item.id === event.target.dataset.groupId,
      );
      if (!group || !isMember(group)) return;

      const text = event.target.elements.message.value.trim();
      const imageUrl = event.target.elements.imageUrl.value.trim();
      if (!text && !imageUrl) {
        showStatus("Write a message or add an image URL before sending.", "danger");
        return;
      }
      if (imageUrl && !isHttpUrl(imageUrl)) {
        showStatus("Use a valid image URL beginning with http:// or https://.", "danger");
        return;
      }

      const message = {
        id: makeId(),
        username: currentUser,
        displayName: currentDisplayName,
        text,
        imageUrl,
        createdAt: new Date().toISOString(),
      };
      if (
        updateGroup(group.id, (item) => ({
          ...item,
          messages: [...item.messages, message],
        }))
      ) {
        render();
        showStatus("Message sent.");
      }
    });

  try {
    groups = readGroups();
    selectedGroupId =
      groups.find((group) => group.members?.some((member) => sameUser(member, currentUser)))
        ?.id ||
      groups[0]?.id ||
      null;
    render();
  } catch (error) {
    showStatus(
      `Could not load groups: ${error.message || "saved data is unavailable."}`,
      "danger",
    );
    renderEmptyDetails(
      "Groups could not be loaded",
      "Reload the page after checking this browser’s saved group data.",
    );
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== GROUPS_KEY) return;
    try {
      groups = readGroups();
      if (!groups.some((group) => group.id === selectedGroupId)) {
        selectedGroupId = groups[0]?.id || null;
      }
      render();
    } catch (error) {
      showStatus(`Could not refresh groups: ${error.message}`, "danger");
    }
  });
})();
