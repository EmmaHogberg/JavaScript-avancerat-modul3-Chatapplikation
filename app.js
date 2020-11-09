(function () {
  let dataConnection = null;
  let mediaConnection = null;
  const listPeersButtonEl = document.querySelector(".list-all-peers-button");
  const peersEl = document.querySelector(".peers");
  const sendButtonEL = document.querySelector(".send-new-message-button");
  const newMessageEL = document.querySelector(".new-message");
  const messagesEl = document.querySelector(".messages");
  const theirVideoContainer = document.querySelector(".video-container.them");
  const videoOfMeEl = document.querySelector(".video-container.me video");
  const videoOfThemEl = document.querySelector(".video-container.them video");

  // Display video of me
  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then((stream) => {
      videoOfMeEl.muted = true;
      videoOfMeEl.srcObject = stream;
    });

  // Send message function
  const printMessage = (text, who) => {
    const messageEl = document.createElement("div");
    messageEl.classList.add("message", who);

    // Time-stamp
    let today = new Date();
    let hours = today.getHours();
    let minutes = today.getMinutes();
    let seconds = today.getSeconds();

    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    let time = hours + ":" + minutes + ":" + seconds;

    // Message
    messageEl.innerHTML = `<div>${time}<br>${text}</div>`;
    messagesEl.append(messageEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  // Get peer id (hash) from URL
  const myPeerId = location.hash.slice(1);

  // Connect to Peer server
  let peer = new Peer(myPeerId, {
    host: "glajan.com",
    port: 8443,
    path: "/myapp",
    secure: true,
    config: {
      iceServers: [
        { urls: ["stun:eu-turn7.xirsys.com"] },
        {
          username:
            "1FOoA8xKVaXLjpEXov-qcWt37kFZol89r0FA_7Uu_bX89psvi8IjK3tmEPAHf8EeAAAAAF9NXWZnbGFqYW4=",
          credential: "83d7389e-ebc8-11ea-a8ee-0242ac140004",
          urls: [
            "turn:eu-turn7.xirsys.com:80?transport=udp",
            "turn:eu-turn7.xirsys.com:3478?transport=udp",
            "turn:eu-turn7.xirsys.com:80?transport=tcp",
            "turn:eu-turn7.xirsys.com:3478?transport=tcp",
            "turns:eu-turn7.xirsys.com:443?transport=tcp",
            "turns:eu-turn7.xirsys.com:5349?transport=tcp",
          ],
        },
      ],
    },
  });

  // Print peerId on connection "open" event
  peer.on("open", (id) => {
    const myPeerIdEl = document.querySelector(".my-peer-id");
    myPeerIdEl.innerText = id;
  });

  peer.on("error", (errorMessage) => {
    console.error(errorMessage);
  });

  // On incoming connection
  peer.on("connection", (connection) => {
    // Close existing connection and set new connection
    dataConnection && dataConnection.close();
    dataConnection = connection;

    const event = new CustomEvent("peer-changed", {
      detail: connection.peer,
    });
    document.dispatchEvent(event);
  });

  // Event listener for incoming video call
  peer.on("call", (incomingCall) => {
    mediaConnection && mediaConnection.close();

    // Change state of start/stop button
    startVideoButton.classList.remove("active");
    stopVideoButton.classList.add("active");

    // Answer incoming call
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        incomingCall.answer(myStream);
        mediaConnection = incomingCall;
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // Event listener for click "refresh list"
  listPeersButtonEl.addEventListener("click", () => {
    peer.listAllPeers((peers) => {
      peersEl.innerHTML = "";

      const listItems = peers
        .filter((peerId) => peerId !== peer._id)
        .map(
          (peer) =>
            `<li><button class= "connect-button peerId-${peer}">${peer}</button></li>`
        )
        .join("");
      const ul = "<ul>" + listItems + "<ul>";
      peersEl.innerHTML = ul;
    });
  });

  // Event listener for click on peer button
  peersEl.addEventListener("click", (event) => {
    // Only listen to click on button
    if (!event.target.classList.contains("connect-button")) return;

    // Get peerId from button element
    const theirPeerId = event.target.innerText;

    // Close existing connection
    dataConnection && dataConnection.close();

    // Connect to peer
    dataConnection = peer.connect(theirPeerId);

    dataConnection.on("open", () => {
      // Dispatch Custom Event with connected peerId
      const event = new CustomEvent("peer-changed", {
        detail: theirPeerId,
      });
      document.dispatchEvent(event);
    });
  });

  // Event listener for custom event "peer-changed"
  document.addEventListener("peer-changed", (event) => {
    const peerId = event.detail;
    const connectButtonEl = document.querySelector(
      `.connect-button.peerId-${peerId}`
    );

    // Remove class connected from button
    document.querySelectorAll(".connect-button.connected").forEach((button) => {
      button.classList.remove("connected");
    });
    // Add class "connected" to clicked button
    connectButtonEl && connectButtonEl.classList.add("connected");

    // Listen for incoming data/textmessage
    dataConnection.on("data", (textMessage) => {
      printMessage(textMessage, "them");
    });
    // Set focus on text input
    newMessageEL.focus();

    //
    theirVideoContainer.querySelector(".name").innerText = peerId;
    theirVideoContainer.classList.add("connected");
    theirVideoContainer.querySelector(".start").classList.add("active");
    theirVideoContainer.querySelector(".stop").classList.remove("active");
  });

  // Send message to peer
  const sendMessage = (event) => {
    if (!dataConnection) return;
    if (newMessageEL === "") return;

    if (event.type === "click" || event.keyCode === 13) {
      dataConnection.send(newMessageEL.value);
      printMessage(newMessageEL.value, "me");

      // Clear text input field
      newMessageEL.value = "";
    }
    // Set focus on text input
    newMessageEL.focus();
  };

  // Event listeners for "send"
  sendButtonEL.addEventListener("click", sendMessage);
  newMessageEL.addEventListener("keyup", sendMessage);

  // Event listener for click "Start video chat"
  const startVideoButton = theirVideoContainer.querySelector(".start");
  const stopVideoButton = theirVideoContainer.querySelector(".stop");
  startVideoButton.addEventListener("click", () => {
    startVideoButton.classList.remove("active");
    stopVideoButton.classList.add("active");

    // Start video call with remote peer
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        mediaConnection && mediaConnection.close();
        const theirPeerId = dataConnection.peer;
        mediaConnection = peer.call(theirPeerId, myStream);
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // Event listener for click "hang up"
  stopVideoButton.addEventListener("click", () => {
    stopVideoButton.classList.remove("active");
    startVideoButton.classList.add("active");
    mediaConnection && mediaConnection.close();
  });
})();
