const functions = require("firebase-functions");

const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://wherez-ac670-default-rtdb.firebaseio.com/",
});
// const db = admin.firestore();
const rdb = admin.database();

const cors = require("cors")({
  origin: true,
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

//  track user location
exports.trackLocation = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const data = request.body;
    const {uid, lat, lon} = data[0];
    console.log("%s, %s", lat, lon);

    try {
      rdb.ref(`users/${uid}`).update({
        lat: lat,
        lng: lon,
      });

      // const device_token = "d3mhOiHBQQKxRWtGmR-V54:APA91bEBrlFeDnUlrWVWAZqHUiHB_Q19VqaNmcmQ8bza0M3NDCFDnAdlCoKc_PgiAXcfTl_Hhy9enxMiilU1GUAwtlI_DGK1QYEvdMbXY9S8mORuijoYDfep1ugihLwGOs3oeopg07UW";
      // const options = {
      //   priority: "high",
      //   timeToLive: 60 * 60 * 10,
      // };
      // const payload = {
      //   notification: {
      //     title: "User Location Updated",
      //     body: `User UID : ${uid}`,
      //   },
      // };
      // admin.messaging().sendToDevice(device_token, payload, options);

      response.status(200).json({status: 200, msg: "successful updated"});

    } catch (error) {
      response.status(500).json(error);
    }

  });
});
