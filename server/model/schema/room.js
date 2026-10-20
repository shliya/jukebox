const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { ENUM_ROOM_STATUS } = require('../../lib/enum');

const Room = sequelize.define(
    'Room',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: ENUM_ROOM_STATUS.ACTIVE,
            validate: {
                isIn: {
                    args: [Object.values(ENUM_ROOM_STATUS)],
                    msg: '狀態錯誤',
                },
            },
        },
        allowVotes: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'allow_votes',
        },
    },
    {
        tableName: 'rooms',
        timestamps: true,
        underscored: true,
    }
);

module.exports = Room;
