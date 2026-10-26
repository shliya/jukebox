const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Admin = sequelize.define(
    'Admin',
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash',
        },
        lastLoginAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_login_at',
        },
    },
    {
        tableName: 'admins',
        timestamps: true,
        underscored: true,
    }
);

module.exports = Admin;
