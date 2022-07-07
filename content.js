const tabUrl = window.location.href;
const proceed = new RegExp(
  /https\:\/\/laracasts\.com\/series\/([A-Za-z0-9_-]+)\/episodes\/([0-9]+)(|\/)/i
).test(tabUrl)
  ? true
  : false;

if (proceed) {
  var socket = io("https://rehanadil.com:3000", {
    autoConnect: false,
  });
  var allowedEvents = ["play", "pause", "speed", "ended"],
    prevEvent,
    iframe,
    player,
    isPlaying = true;

  const showButton = (type) => {
    document.querySelectorAll(".lwp-button").forEach((button) => {
      button.style.display = "none";
    });

    switch (type) {
      case "connected":
        document.getElementById("btn-leave-party").style.display = "flex";
        break;

      case "connecting":
        document.getElementById("btn-connecting").style.display = "flex";
        break;

      default:
        document.getElementById("btn-dropdown").style.display = "flex";
        break;
    }
  };

  const showModal = (type) => {
    document.querySelectorAll(".lwp-modal").forEach((modal) => {
      modal.style.display = "none";
    });

    switch (type) {
      case "host":
        document.getElementById("lwp-host-modal").style.display = "flex";
        break;

      case "join":
        document.getElementById("lwp-join-modal").style.display = "flex";
        break;

      default:
        break;
    }

    document.getElementById("lwp-" + type + "-modal").style.display = "flex";
  };

  const hideModal = (type) => {
    switch (type) {
      case "host":
        document.getElementById("lwp-host-modal").style.display = "none";
        break;

      case "join":
        document.getElementById("lwp-join-modal").style.display = "none";
        break;

      default:
        document.querySelectorAll(".lwp-modal").forEach((modal) => {
          modal.style.display = "none";
        });
        break;
    }
  };

  const preparePlayer = () => {
    if (iframe && player) return false;

    iframe = document.getElementsByTagName("iframe")[0];
    player = new Vimeo.Player(iframe);

    player.on("play", (data) => {
      if (prevEvent == "play") return;

      socket.emit(
        "send-status",
        {
          url: tabUrl,
          event: "play",
          time: data.seconds,
        },
        {
          id: document.getElementById("lwp-host-room").value,
        }
      );
      prevEvent = "play";
      isPlaying = true;
    });

    player.on("pause", (data) => {
      if (prevEvent == "pause") return;

      socket.emit(
        "send-status",
        {
          url: tabUrl,
          event: "pause",
          time: data.seconds,
        },
        {
          id: document.getElementById("lwp-host-room").value,
        }
      );
      prevEvent = "pause";
      isPlaying = false;
    });

    player.on("seeked", (data) => {
      if (isPlaying) {
        player.pause();
        isPlaying = false;
      } else {
        player.play();
        isPlaying = true;
      }
    });

    player.on("playbackratechange", (data) => {
      socket.emit(
        "send-status",
        {
          url: tabUrl,
          event: "speed",
          speed: data.playbackRate,
        },
        {
          id: document.getElementById("lwp-host-room").value,
        }
      );
    });

    player.on("ended", (data) => {
      if (prevEvent == "ended") return;

      socket.emit(
        "send-status",
        {
          url: tabUrl,
          event: "ended",
          time: data.seconds,
        },
        {
          id: document.getElementById("lwp-host-room").value,
        }
      );
      prevEvent = "ended";
    });
  };

  const controlVimeo = (status) => {
    preparePlayer();

    const event = status.event;

    if (event == prevEvent) return false;
    if (!allowedEvents.includes(event)) return false;
    prevEvent = event == "speed" ? prevEvent : event;

    if (event === "play") {
      player.setCurrentTime(status.time);
      player.play();
    }

    if (event === "pause") {
      player.pause();
      player.setCurrentTime(status.time);
    }

    if (event === "seeked") {
      player.setCurrentTime(status.time);
    }

    if (event === "speed") {
      player
        .setPlaybackRate(status.speed)
        .then(function (playbackRate) {})
        .catch(function (error) {
          console.log("Speed Set Error", error.name);
        });
    }

    if (event === "ended") {
      player.setCurrentTime(status.time);
    }
  };

  // Inject dependencies into DOM
  document.head.insertAdjacentHTML(
    "beforeend",
    `<link
      rel="stylesheet"
      href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/fontawesome.min.css"
      integrity="sha512-xX2rYBFJSj86W54Fyv1de80DWBq7zYLn2z0I9bIhQG+rxIF6XVJUpdGnsNHWRa6AvP89vtFupEPDP8eZAtu9qA=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />
    <link
      rel="stylesheet"
      href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/solid.min.css"
      integrity="sha512-qzgHTQ60z8RJitD5a28/c47in6WlHGuyRvMusdnuWWBB6fZ0DWG/KyfchGSBlLVeqAz+1LzNq+gGZkCSHnSd3g=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
    />
    <link href="//fonts.googleapis.com/css2?family=Sen&display=swap" rel="stylesheet">`
  );

  // Render and Insert Connecting Party HTML into body
  fetch(chrome.runtime.getURL("/assets/html/btn-connecting.html"))
    .then((r) => r.text())
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
    });

  // Render and Insert dropdown HTML into body
  fetch(chrome.runtime.getURL("/assets/html/btn-dropdown.html"))
    .then((r) => r.text())
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);

      // Join Party Button onClick
      document.getElementById("join-modal-btn").onclick = () => {
        // Show join modal
        showModal("join");
      };

      // Host Party Button onClick
      document.getElementById("host-modal-btn").onclick = () => {
        // Show host modal
        showModal("host");

        // Copy room ID into clipboard for copy/paste
        navigator.clipboard.writeText(
          document.getElementById("lwp-host-room").value
        );

        // Show connecting button
        showButton("connecting");

        // Prepare Player
        preparePlayer();

        // Socket connection
        socket.connect();

        socket.on("connect", () => {
          showButton("connected");
        });
        socket.on("disconnect", () => {
          showButton("watch-party");
        });

        // Join room
        socket.emit("join-room", {
          id: document.getElementById("lwp-host-room").value,
        });

        // Receive status from server
        socket.on("receive-status", (status, room) => {
          controlVimeo(status);
        });
      };
    });

  // Render and Insert Leave Party HTML into body
  fetch(chrome.runtime.getURL("/assets/html/btn-leave-party.html"))
    .then((r) => r.text())
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
      // Leave Party Button onClick
      document.getElementById("btn-leave-party").onclick = () => {
        socket.disconnect();
      };
    });

  // Render and Insert Host modal HTML into body
  fetch(chrome.runtime.getURL("/assets/html/host-modal.html"))
    .then((r) => r.text())
    .then((html) => {
      // Insert HTML at the end of body
      document.body.insertAdjacentHTML("beforeend", html);

      // Create/Get Room ID
      chrome.storage.local.get(["roomid"], function (result) {
        let roomid = result.roomid == "undefined" ? "" : result.roomid;

        if (roomid !== "") {
          document.getElementById("lwp-host-room").value = roomid;
          return;
        }

        let characters = "abcdefghijklmnopqrstuvwxyz_-0123456789";
        let charactersLength = characters.length;
        for (let i = 0; i < 27; i++) {
          roomid += characters.charAt(
            Math.floor(Math.random() * charactersLength)
          );
        }

        chrome.storage.local.set({ roomid: roomid }, function () {
          document.getElementById("lwp-host-room").value = roomid;
        });
      });

      document.getElementById("lwp-host-modal").onclick = function (e) {
        e.preventDefault();

        if (e.target !== document.getElementById("lwp-host-modal")) return;

        this.style.display = "none";
      };
    });

  // Render and Insert Join modal HTML into body
  fetch(chrome.runtime.getURL("/assets/html/join-modal.html"))
    .then((r) => r.text())
    .then((html) => {
      document.body.insertAdjacentHTML("beforeend", html);
      document.getElementById("lwp-join-modal").onclick = function (e) {
        e.preventDefault();

        if (e.target !== document.getElementById("lwp-join-modal")) return;

        this.style.display = "none";
      };
      chrome.storage.local.get(["roomid"], function (result) {
        let roomid = result.roomid;

        if (roomid == "") return;

        document.getElementById("lwp-join-room").value = roomid;
        return;
      });
      document.getElementById("lwp-join-btn").onclick = () => {
        // Hide modals
        hideModal();

        // Show connecting button
        showButton("connecting");

        // Prepare Player
        preparePlayer();

        // Socket connection
        socket.connect();

        socket.on("connect", () => {
          showButton("connected");
        });
        socket.on("disconnect", () => {
          showButton("watch-party");
        });

        socket.emit("join-room", {
          id: document.getElementById("lwp-join-room").value,
        });
        socket.on("receive-status", (status, room) => {
          controlVimeo(status);
        });
        chrome.storage.local.set(
          { roomid: document.getElementById("lwp-join-room").value },
          function () {}
        );
      };
    });

  // window.addEventListener(
  //   "message",
  //   function (e) {
  //     if (!socket) return false;

  //     if (!/^https?:\/\/player.vimeo.com/.test(e.origin)) return false;

  //     if (typeof e.data == "undefined" || typeof e.data.data == "undefined")
  //       return false;

  //     let e1 = e.data;
  //     let e2 = e.data.data;

  //     let event = e1.event;
  //     let seconds = e2.seconds;

  //     if (!allowedEvents.includes(event)) return false;

  //     if (event == prevEvent) return false;

  //     prevEvent = event;

  //     socket.emit(
  //       "send-status",
  //       {
  //         url: tabUrl,
  //         event: event,
  //         time: seconds,
  //       },
  //       {
  //         id: document.getElementById("lwp-host-room").value,
  //       }
  //     );
  //   },
  //   false
  // );

  // Functions
  // function sendVimeo()
  // {
  //   if (!socket) return;

  //   const iframe = document.getElementsByTagName("iframe")[0];
  //   const player = new Vimeo.Player(iframe);

  //   player.on("play", () => {
  //     if (!socket) return;

  //     bassj = 1;
  //     player.getCurrentTime().then((seconds) => {
  //       bassj = seconds;
  //     });
  //     console.log("Play time", bassj);

  //     socket.emit(
  //       "send-status",
  //       {
  //         event: "play",
  //         time: player.getCurrentTime(),
  //       },
  //       {
  //         id: document.getElementById("lwp-host-room").value,
  //       }
  //     );
  //   });

  //   player.on("pause", () => {
  //     if (!socket) return;

  //     bassj = 2;
  //     player.getCurrentTime().then((seconds) => {
  //       bassj = seconds;
  //     });
  //     console.log("Pause time", bassj);

  //     socket.emit(
  //       "send-status",
  //       {
  //         event: "pause",
  //         time: player.getCurrentTime(),
  //       },
  //       {
  //         id: document.getElementById("lwp-host-room").value,
  //       }
  //     );
  //   });
  // }
}
