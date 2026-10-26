/**
 * 集中載入 schema 並設定關聯；其他地方一律從這裡 require model
 */
const Room = require('./schema/room');
const Song = require('./schema/song');
const Ticket = require('./schema/ticket');
const SongVote = require('./schema/song-vote');
const Admin = require('./schema/admin');

Room.hasMany(Song, { foreignKey: 'roomId', as: 'songs' });
Song.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Room.hasMany(Ticket, { foreignKey: 'roomId', as: 'tickets' });
Ticket.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Ticket.hasMany(SongVote, { foreignKey: 'ticketId', as: 'votes' });
SongVote.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

Song.hasMany(SongVote, { foreignKey: 'songId', as: 'votes' });
SongVote.belongsTo(Song, { foreignKey: 'songId', as: 'song' });

module.exports = {
    Room,
    Song,
    Ticket,
    SongVote,
    Admin,
};
