const fs = require("fs");
const path = require("path");

// external dependencies
const express = require("express");
const request = require("request");
const twitch = require("twitch-api-v5");

const FFMpeg = require("fluent-ffmpeg");
const gm = require("gm").subClass({imageMagick: true});
const {spawn} = require("child_process");

// construct express app
const app = express();

function listStreams(twitch, callback) {
  let parameters = {"game": "PLAYERUNKNOWN\'S BATTLEGROUNDS",
    "language": "en", "limit": 25};

  twitch.streams.live(parameters, function(err, body) {
    if (err) console.log(err);
    else {
      allAgesStreams = body.streams.filter(function(stream) {
        return stream.channel.mature == false;
      });
      return callback(allAgesStreams);
    }
  });
}

function updateStreamsList(cropsDir) {
  // get list of twitch streams and record each one
  listStreams(twitch, function(response) {
    let streamsList = response;
    console.log(streamsList.length);
    let array = [];
    let newAllStreams = [];

    for (let stream in streamsList) {
      let streamName = streamsList[stream].channel.display_name;
      jsonBody = "{\"name\" : \"" + streamName + "\"}";
      console.log(streamName);

      let requestOptions = {
        url: "http://" + process.env.LIVESTREAMER_HOST + "/record_streamer",
        headers: {
            "content-type": "application/json",
        },
        body: jsonBody,
      };

      request.post(requestOptions, function(err, httpResponse, body) {
        console.log(requestOptions);
        console.log(body);
      });
    }
  });
}

function main() {
  const clipsDir = "./streams/clips/";
  const thumbnailsDir = "./streams/thumbnails/";
  const cropsDir = "./streams/crops/";

  // auth with Twitch
  twitch.clientID = process.env.token;

  // init website with lowest stream.
  updateStreamsList(cropsDir);

  // continue searching for lowest stream every 30 seconds.
  setInterval(function() {
    updateStreamsList(cropsDir);
  }, 30000);


  // start http server and log success
  app.listen(3000, function() {
    console.log("Example app listening on port 3000!");
  });
}

main();
