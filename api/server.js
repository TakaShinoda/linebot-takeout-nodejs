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

//ブラウザ確認用(無くても問題ない)
app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)'));

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'location') {
      return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '位置情報を送信してね！'
      })
  }

  // 緯度
  const lat = event.message.latitude
  // 経度
  const lng = event.message.longitude

  let yelpREST = axios.create({
    baseURL: "https://api.yelp.com/v3/",
    headers: {
      Authorization: `Bearer ${process.env.YELP_API_KEY}`,
      "Content-type": "application/json",
    },
  })

  await yelpREST.get("/businesses/search", {
    params: {
      latitude: lat,
      longitude: lng,
      radius: 500, // 半径500m
      term: "takeout",
      sort_by: "distance",
      limit: 10,
    },
  })
    .then(function (response) {
        // handle success
        console.log(response.data)
        if(response.data.total === 0) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '近くにお店はありませんでした！'
            })
        }
          // carouselは最大10
          let columns = [];
          for (let item of response.data.businesses) {
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
        return client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: 'おいしそうだね！'
          },
          {
            type: 'template',
            altText: '店舗情報を送信しました！',
            template: {
                type: 'carousel',
                columns: columns
            }
        }]);
    })
    .catch(function (error) {
        // handle error
        console.log(error);
    })
}

(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
console.log(`Server running at ${PORT}`);