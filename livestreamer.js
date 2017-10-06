// dependencies
const express = require("express");
const path = require("path");
const FFMpeg = require("fluent-ffmpeg");

const {spawn} = require("child_process");

const fs = require("fs");
var bodyParser = require('body-parser')
const app = express();

const data = {
  clipsDir: "./streams/clips/",
  thumbnailsDir: "./streams/thumbnails/",
  cropsDir: "./streams/crops/",
};

function ensureDir(dirPath) {
  const parts = dirPath.split(path.sep);
  const mkdirSync = function(dirPath) {
    try {
      fs.mkdirSync(dirPath);
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
  };

  for (let i = 1; i <= parts.length; i++) {
    mkdirSync(path.join.apply(null, parts.slice(0, i)));
  }
}

function recordStream(streamName) {
  return new Promise((resolve, reject) => {
    console.log("recording clip of stream: " + streamName);
    const child = spawn("livestreamer", ["--yes-run-as-root", "-Q", "-f",
      "--twitch-oauth-token", process.env.token,
      "twitch.tv/" + streamName, "best", "-o",
      data.clipsDir + streamName + ".mp4"]);
    setTimeout(function() {
      child.kill("SIGINT");
      console.log("recorded stream: " + streamName);
      resolve(streamName);
    }, 4000);
  });
}

function takeScreenshot(streamName) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(data.clipsDir + streamName + ".mp4")) {
      console.log("taking screenshot of stream: " + streamName);
      new FFMpeg(data.clipsDir + streamName + ".mp4")
        .takeScreenshots({
          timestamps: [0],
          folder: data.thumbnailsDir,
          filename: streamName + ".png",
        })
        .on("end", function() {
          console.log("TOOK screenshot of stream: " + streamName);
          resolve(streamName);
        })
        .on("error", function(err) {
          fs.unlinkSync(data.clipsDir + streamName + ".mp4");
          console.log("Deleted " + data.clipsDir
                        + streamName + ".mp4");
          reject(new Error("An error occurred: " + err.message));
        });
    } else {
      reject(new Error("File " + data.clipsDir
        + streamName + ".mp4 not found."));
    }
  });
}

app.use(bodyParser.json());

app.post("/record_streamer", function(req, res) {

  recordStream(req.body.name)
    .then(takeScreenshot)
    .catch((error) => {
      console.log(error.message);
    });
  res.send("{\"message\":\"ok\"}")
});


// start http server and log success
app.listen(3002, function() {
  console.log("Livestreamer service listening on port 3002!");
});
