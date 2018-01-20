var _ = require('lodash');
var Promise = require('bluebird');

const queue = [];

function update(message, channel, nickname) {
    var self = this;
    if (nickname === 'CTCP') {
        return;
    }
    if (self.queue.length === self.limit) {
        self.queue.pop();
    }
    self.queue.unshift({
        "message": message,
        "nickname": nickname,
        "channel": channel
    });
}

function getRandomMessage() {
    var self = this;
    return Promise.try(function() {
        return self.queue[Math.floor(Math.random()*self.queue.length)];
    });
}

function findCorrectable(target, channel) {
    var self = this;
    return Promise.try(function() {
        var maybeMatches = _.filter(self.queue, function(IRCMessage) {
            if (IRCMessage.channel === channel) {
                if (!_.startsWith(IRCMessage.message, 's/')) {
                    return IRCMessage.message.indexOf(target) > -1;
                }
            }
        });
        return _.first(maybeMatches);
    });
}

module.exports = function(limit) {
    return {
        queue: queue,
        limit: limit,
        update: update,
        findCorrectable: findCorrectable,
        getRandomMessage: getRandomMessage
    };
};