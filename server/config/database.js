require('dotenv').config();

const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';
const dbEnvName = isProduction ? 'DATABASE_URL' : 'TEST_DB_URL';
const dbUrl = process.env[dbEnvName];

if (!dbUrl) {
    throw new Error(
        `缺少資料庫連線字串 ${dbEnvName}（請參考 .env.example 建立 .env）`
    );
}

const ssl = isProduction
    ? {
          require: true,
          rejectUnauthorized: false,
      }
    : false;

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    quoteIdentifiers: true,
    dialectOptions: {
        ssl,
        statement_timeout: 60000,
        idle_in_transaction_session_timeout: 60000,
    },
    pool: {
        max: isProduction ? 5 : 10,
        min: 0,
        acquire: 60000,
        idle: 10000,
    },
});

module.exports = sequelize;
