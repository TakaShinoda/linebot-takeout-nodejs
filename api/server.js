'use strict';
require('dotenv').config();

const axios = require('axios')
const express = require('express');
const line = require('@line/bot-sdk');
const { response } = require('express');
const PORT = process.env.PORT || 3000;

const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
};

const app = express();

app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'location') {
      console.log('位置情報以外')
      return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '位置情報を送信してねー！'
      })
    // return Promise.resolve(null);
  }

// 緯度
const lat = event.message.latitude
// 経度
const lng = event.message.longitude


//   axios.get('https://api.yelp.com/v3/businesses/search')
let yelpREST = axios.create({
    baseURL: "https://api.yelp.com/v3/",
    headers: {
      Authorization: `Bearer ${process.env.YELP_API_KEY}`,
      "Content-type": "application/json",
    },
  })

  yelpREST("/businesses/search", {
    params: {
      latitude: lat,
      longitude: lng,
      radius: 500, // 半径500m
      term: "takeout",
      sort_by: "distance",
      limit: 1,
    },
  })
    .then(function (response) {
        // handle success
        console.log(response.data)

        if(response.data.total === 0) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '近くにお店はありません'
            })
        }


          //コールバックで色々な処理
          // carouselは最大10
          let columns = [];
          for (var item of response.data.businesses) {
            columns.push({
              "thumbnailImageUrl": item.image_url,
              "title": item.alias,
              "text": '⭐️' + item.rating,
              "actions": [{
                "type": "uri",
                "label": "yelpでみる",
                "uri": item.url
              }]
            });
          }
        console.log(columns)
        return client.replyMessage(event.replyToken, {
            type: 'template',
            altText: 'This is a carousel message',
            template: {
                type: 'carousel',
                columns: columns
            }
        });
    })
    .catch(function (error) {
        // handle error
        console.log(error);
    })
}

// app.listen(PORT);
// console.log(`Server running at ${PORT}`);

(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
console.log(`Server running at ${PORT}`);