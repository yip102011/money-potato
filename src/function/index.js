import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import cheerio from "cheerio";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

export const GetTimeDispost = async (event) => {
  const command = new QueryCommand({
    TableName: "CoffeeCrop",
    KeyConditionExpression: "OriginCountry = :originCountry AND RoastDate > :roastDate",
    ExpressionAttributeValues: {
      ":originCountry": "Ethiopia",
      ":roastDate": "2023-05-01",
    },
    ConsistentRead: true,
  });

  const queryResult = await docClient.send(command);
  console.log(response);

  // Construct the response object
  const response = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Hello, world!",
    }),
  };

  return response;
};

export const GrapTimeDepositFromHSBC = async (event) => {
  try {
    console.log("Start function");

    // Download HTML from the URL
    var response = await axios.get("https://www.hsbc.com.hk/zh-hk/accounts/offers/deposits/#preferential-new-fund-time-deposit-offers");
    var html = response.data;
    console.log("downloaded html");

    // Extract the value from the specified element using a HTML parser like Cheerio
    var $ = cheerio.load(html);

    // Create a timestamp for the current time
    var today = get_today_yyyymmdd();

    // Create the items to be stored in DynamoDB
    const bank = "hkbc";
    var interest_rate_3_month = Number($("#content_main_basicTable_3 > table > tbody > tr:nth-child(2) > td:nth-child(2) > span").text().replace("%", ""));
    var deposit_3_month = {
      date: today,
      bank: bank,
      annual_interest_rates: interest_rate_3_month,
      fixed_term: "3 months",
    };

    var interest_rate_6_month = Number($("#content_main_basicTable_3 > table > tbody > tr:nth-child(3) > td:nth-child(2) > span").text().replace("%", ""));
    var deposit_6_month = {
      date: today,
      bank: bank,
      annual_interest_rates: interest_rate_6_month,
      fixed_term: "6 months",
    };

    // put items into DynamoDB
    console.log("Start put item into DynamoDB");
    const table_name = "TimeDeposit";

    var deposit_items = Array(deposit_3_month, deposit_6_month);
    var task_list = deposit_items.map((item) => {
      var putCommand = new PutCommand({ TableName: table_name, Item: item });
      var task = docClient.send(putCommand);
      return task;
    });

    console.log("waiting promise all");
    var results = await Promise.all(task_list);
    console.log(results);

    console.log("Items stored in DynamoDB successfully.");
  } catch (error) {
    console.error("Error:", error);
    return error;
  }
};

function get_today_yyyymmdd() {
  const currentDate = new Date();
  const year = String(currentDate.getFullYear());
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  var yyyymmdd = year + month + day;
  return yyyymmdd;
}

function get_yesterday_yyyymmdd() {
  const currentDate = new Date();
  const year = String(currentDate.getFullYear());
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");
  var yyyymmdd = year + month + day;
  return yyyymmdd;
}
