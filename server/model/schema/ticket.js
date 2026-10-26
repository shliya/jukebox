const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { ENUM_TICKET_STATUS, ENUM_TICKET_TYPE } = require('../../lib/enum');

const Ticket = sequelize.define(
    'Ticket',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        roomId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'room_id',
        },
        code: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        status: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: ENUM_TICKET_STATUS.ACTIVE,
            validate: {
                isIn: {
                    args: [Object.values(ENUM_TICKET_STATUS)],
                    msg: '狀態錯誤',
                },
            },
        },
        type: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: ENUM_TICKET_TYPE.NORMAL,
            validate: {
                isIn: {
                    args: [Object.values(ENUM_TICKET_TYPE)],
                    msg: '票券類型錯誤',
                },
            },
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_login_at',
        },
    },
    {
        tableName: 'tickets',
        timestamps: true,
        underscored: true,
    }
);

module.exports = Ticket;
