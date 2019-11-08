var figlet = require("figlet");
const inquirer = require("inquirer");
const ora = require("ora");
const axios = require("axios").default;
const chalk = require("chalk");
const { ChatManager, TokenProvider } = require("@pusher/chatkit-client");
const { JSDOM } = require("jsdom");
const readline = require("readline");
const API = "https://alohacli.herokuapp.com/";
const fs = require("fs");
const keys = require("./keys");

const loader = ora({
  spinner: {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  }
});

console.log(
  chalk.blue(
    figlet.textSync("ALOHA CLI CHAT", {
      font: "cyberlarge"
    })
  )
);

makeCompatiblewithcommadline = () => {
  const { window } = new JSDOM();
  global.window = window;
  global.navigator = {};
};

makeCompatiblewithcommadline();

//
const menu = () => {
  var jwt = JSON.parse(fs.readFileSync("./creds.json", { encoding: "utf8" }));
  // console.log(jwt);
  loader.start();
  const chatmanager = new ChatManager({
    instanceLocator: keys.pusherlocator,
    userId: jwt.email,
    tokenProvider: new TokenProvider({
      url: `${API}auth/` + jwt.jwt
    })
  });

  chatmanager
    .connect()
    .then(data => {
      loader.stop();

      inquirer
        .prompt([
          {
            type: "list",
            message: "action",
            name: "action",
            choices: [
              "Create_room",
              "Join_room",
              "My_rooms",
              "Add_user_to_room",
              "Exit"
            ]
          }
        ])
        .then(awsners => {
          if (awsners.action === "Create_room") {
            inquirer
              .prompt([
                {
                  type: "input",
                  message: "Room name",
                  name: "roomname"
                },
                {
                  type: "list",
                  message: "Private room",
                  name: "privateroom",
                  choices: ["yes", "no"]
                }
              ])
              .then(awsners => {
                createRoom(awsners, data);
              })
              .catch(err => console.log(err));
          } else if (awsners.action === "Join_room") {
            joinroom(data);
          } else if (awsners.action === "My_rooms") {
            myrooms(data);
          } else if (awsners.action === "Add_user_to_room") {
            addusertoroom(data);
          } else if (awsners.action === "Exit") {
            process.exit();
          }
        })
        .catch(err => {
          // console.log(err);
        });

      // console.log(data);
      //subscribe to a room from room list
      // subsroom(data);
    })
    .catch(err => {
      console.log(err);
    });
};

try {
  var creds = JSON.parse(fs.readFileSync("./creds.json", { encoding: "utf8" }));
  console.log("Welcome back " + creds.email);
  menu();
} catch (error) {
  // console.log(error);
  console.log("No previous valid credentials found");

  inquirer
    .prompt([
      {
        type: "list",
        message: "Welcome to aloha cli chat",
        name: "type",
        choices: ["Existing_user", "New_user", "Forgot_password", "Exit"]
      }
    ])
    .then(answers => {
      if (answers.type === "New_user") {
        inquirer
          .prompt([
            {
              type: "input",
              message: "Name",
              name: "name"
            },
            {
              type: "input",
              message: "Email",
              name: "email"
            },
            {
              type: "password",
              message: "Password",
              name: "pass"
            }
          ])

          .then(doc1 => {
            loader.start();

            axios
              .post(`${API}newuser`, doc1)
              .then(result => {
                loader.stop();
                console.log(result.data);
                if (result.data.msg === "success") {
                  console.log("user added successfully");
                }
                process.exit();
              })
              .catch(err => {
                loader.stop();
                console.log(err.response.data);
              });
          })
          .catch(err => {
            console.log(err.response.data);
          });
      } else if (answers.type === "Existing_user") {
        inquirer
          .prompt([
            {
              type: "input",
              message: "Email",
              name: "email"
            },

            {
              type: "password",
              message: "Password",
              name: "pass"
            }
          ])
          .then(doc2 => {
            // console.log(doc2);
            loader.start();
            axios
              .post(`${API}login`, doc2)
              .then(result => {
                loader.stop();
                if (result.data.msg === "success") {
                  console.log(result.data);
                  console.log("Welcome " + result.data.name);
                  result.data.email = doc2.email;
                  fs.writeFileSync("./creds.json", JSON.stringify(result.data));
                  menu();
                } else {
                }
              })
              .catch(err => {
                loader.stop();
                console.log(err.response.data.msg);
                process.exit();
              });
          });
      } else if (answers.type === "Exit") {
        process.exit();
      }
    });
}

const createRoom = async (obj, user) => {
  loader.start();
  console.log(obj);
  user
    .createRoom({
      name: obj.roomname,
      private: obj.privateroom === "yes"
    })
    .then(room => {
      loader.stop();
      console.log(`Created room called ${room.name}`);
      menu();
    })
    .catch(err => {
      loader.stop();
      console.log(`Error creating room ${err}`);
    });
};

const myrooms = async user => {
  loader.start();
  const avaiblerooms = await user.getJoinableRooms();
  const allromms = [...avaiblerooms, ...user.rooms];

  // console.log(allromms);

  allromms.forEach((element, index) => {
    console.log("room " + index + " " + element.name);
  });
  loader.stop();
  menu();
};

const joinroom = async user => {
  const avaiblerooms = await user.getJoinableRooms();

  var jwt = JSON.parse(fs.readFileSync("./creds.json", { encoding: "utf8" }));
  // console.log(jwt);

  const allromms = [...avaiblerooms, ...user.rooms];
  var arr = [];

  allromms.forEach((element, index) => {
    arr.push(element.name);
    // console.log("rooms " + index + " " + JSON.stringify(element.name));
  });

  inquirer
    .prompt([
      {
        type: "list",
        message: "Select room",
        name: "roomname",
        choices: arr
      }
    ])
    .then(async awsners => {
      loader.start();
      var roomindex = arr.indexOf(awsners.roomname);
      console.log("type !exit to exit room");
      var roomId = allromms[roomindex].id;
      console.log(roomId);
      loader.stop();
      await user.subscribeToRoomMultipart({
        roomId: roomId,
        hooks: {
          onMessage: message => {
            // this hook will run when a new message is recieved displaying the message

            if (message.senderId !== jwt.email) {
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
              console.log(
                message.senderId + " : " + message.parts[0].payload.content
              );
            }
          },
          onUserJoined: userobj => {
            //this hook will run when a new user is joind to the room diaplaying the joined message
            console.log(userobj.name + "joined...\n");
          }
        },

        messageLimit: 0
      });

      const input = readline.createInterface({ input: process.stdin });

      input.on("line", async test => {
        if (test === "!exit") {
          user.roomSubscriptions[roomId].cancel();
          menu();
        } else {
          process.stdout.write("you: ");
          await user.sendSimpleMessage({ roomId: roomId, text: test });
        }
      });
    })
    .catch(err => console.log(err));
};

//for future use

const fetcholder = async (user, roomId) => {
  user
    .fetchMultipartMessages({
      roomId: roomId,
      initialId: 42,
      direction: "older",
      limit: 10
    })
    .then(messages => {
      // do something with the messages
    })
    .catch(err => {
      console.log(`Error fetching messages: ${err}`);
    });
};

const addusertoroom = async user => {
  const avaiblerooms = await user.getJoinableRooms();
  const allromms = [...avaiblerooms, ...user.rooms];

  var arr = [];

  allromms.forEach((element, index) => {
    arr.push(element.name);
  });

  inquirer
    .prompt([
      {
        type: "input",
        message: "Enter user email",
        name: "newuserid"
      },
      {
        type: "list",
        message: "Select room",
        name: "roomname",
        choices: arr
      }
    ])
    .then(async awsners => {
      loader.start();
      var roomindex = arr.indexOf(awsners.roomname);
      var roomId = allromms[roomindex].id;
      user
        .addUserToRoom({
          userId: awsners.newuserid,
          roomId: roomId
        })
        .then(() => {
          loader.stop();
          loader.succeed();
          console.log(`Added ${awsners.newuserid} to room ${roomId}`);
          menu();
        })
        .catch(err => {
          loader.stop();
          loader.fail();
          console.log(
            `Error adding ${awsners.newuserid} to room ${roomId}: ${err}`
          );
        });
    })
    .catch(err => console.log(err));
};

// const sendmsg = async (user, roomId) => {
//   inquirer
//     .prompt({
//       type: "input",
//       message: "you",
//       name: "sendmsg"
//     })
//     .then(async test => {
//       if (test.sendmsg === "!exit") {
//         menu();
//       } else {
//         getmsg(user, roomId);
//         await user.sendSimpleMessage({
//           roomId: roomId,
//           text: test.sendmsg
//         });
//       }
//     })
//     .catch(err => {
//       console.log(err);
//     });
// };
