const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

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
            unique: true, // 一張票只有一筆，改選 = update song_id
            field: 'ticket_id',
        },
        songId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            field: 'song_id',
        },
    },
    {
        tableName: 'song_votes',
        timestamps: true,
        underscored: true,
    }
);

module.exports = SongVote;
