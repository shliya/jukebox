const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');
const { ENUM_SONG_SOURCE } = require('../../lib/enum');

const Song = sequelize.define(
    'Song',
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
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        artist: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        source: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            defaultValue: ENUM_SONG_SOURCE.MANUAL,
            validate: {
                isIn: {
                    args: [Object.values(ENUM_SONG_SOURCE)],
                    msg: '來源錯誤',
                },
            },
        },
        // 外部來源識別（例如 YouTube videoId），手動建立時為 null
        sourceRef: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'source_ref',
        },
        durationSec: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'duration_sec',
        },
        tags: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
    },
    {
        tableName: 'songs',
        timestamps: true,
        underscored: true,
    }
);

module.exports = Song;
