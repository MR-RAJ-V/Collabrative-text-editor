const docs = new Map();
const roomUsers = new Map();

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

module.exports = {
  docs,
  getIO,
  roomUsers,
  setIO,
};
