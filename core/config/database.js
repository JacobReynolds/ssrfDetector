var dbURL = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@"+process.env.MONGODB_HOST+"/" + process.env.MONGODB_DATABASE;


module.exports = {
  'url': dbURL
}
