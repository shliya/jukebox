const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { ENUM_VOTE_CATEGORY } = require('../../lib/enum');

const SongVote = sequelize.define(
    'SongVote',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        ticketId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'ticket_id',
        },
        songId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'song_id',
        },
        category: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: ENUM_VOTE_CATEGORY.GENERAL,
            validate: {
                isIn: {
                    args: [Object.values(ENUM_VOTE_CATEGORY)],
                    msg: '點歌類別錯誤',
                },
            },
        },
    },
    {
        tableName: 'song_votes',
        timestamps: true,
        underscored: true,
        // 一張票每個類別只有一筆，改選 = update song_id
        indexes: [{ unique: true, fields: ['ticket_id', 'category'] }],
    }
);

module.exports = SongVote;
