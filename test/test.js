var should = require('should');
var assert = require('assert');

var plugin = require('../plugin').init({
    _logger: {
        error: function(msg){
            console.log(msg);
        }
    },
    config: function() {
        return {
            lookBackLimit: 3
        };
    }
});

should.Assertion.add('noticeFailure', function() {
    this.params = {
        operator: 'to be a notice with an error in the message'
    };

    this.obj.should.have.property('intent').which.is.equal('notice');
    this.obj.should.have.property('query').which.is.equal(true);
    this.obj.should.have.property('message').which.is.not.empty();
});

describe('tennu-correction', function() {

    describe('Correction', function(){
        
        it('Should correct a newly added message.', function() {
            plugin.handlers['privmsg']({
                message: 'hello world',
                nickname: 'tester',
                channel: '#helloworld'
            });
            plugin.handlers['privmsg']({
                message: 's/hello world/goodbye world',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.equal('Correction, <tester> \u0002goodbye world\u0002');
        });
    
        it('Should respond with URLs', function() {
            plugin.handlers['privmsg']({
                message: 'hello world',
                nickname: 'tester',
                channel: '#helloworld'
            });
            plugin.handlers['privmsg']({
                message: 's/hello world/http:////www.google.com world',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.equal('Correction, <tester> \u0002http://www.google.com world\u0002');
        });
    
        it('Should fail with incorrect escaping', function() {
            plugin.handlers['privmsg']({
                message: 's/hello world//whatever',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.a.noticeFailure();
        });
    
        it('Should fail with incorrect slashes', function() {
            plugin.handlers['privmsg']({
                message: 's/hello world',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.a.noticeFailure();
        });
    
        it('Should use middleware.', function() {
            plugin.exports.addMiddleware(function() {
                return 42;
            });
            plugin.handlers['privmsg']({
                message: 's/hello world/goodbye world',
                nickname: 'smith',
                channel: '#helloworld'
            })
            .then(function(middlewareResponse){
                plugin.exports.addMiddleware(undefined);
                return middlewareResponse;
            })
            .should.eventually.be.equal(42);
        });
        
    });
    
    describe('Random Replace', function(){
        
        it('Should randomly correct a newly added message.', function() {
            plugin.handlers['privmsg']({
                message: 'hello world',
                nickname: 'tester',
                channel: '#helloworld'
            });
            plugin.handlers['privmsg']({
                message: 'ra/surprise',
                nickname: 'smith',
                channel: '#helloworld'
            })
            .then(function(correctedMessage){
                assert.ok(correctedMessage.indexOf('\u0002surprise\u0002') > -1);
                assert.ok(correctedMessage.indexOf('Correction, ') > -1);
            });
        });
    
        it('Should work with a full sentence.', function() {
            plugin.handlers['privmsg']({
                message: 'hello world',
                nickname: 'tester',
                channel: '#helloworld'
            });
            plugin.handlers['privmsg']({
                message: 'ra/surprise this is a sentence',
                nickname: 'smith',
                channel: '#helloworld'
            })
            .then(function(correctedMessage){
                assert.ok(correctedMessage.indexOf('\u0002surprise this is a sentence\u0002') > -1);
            });
        });
    
        it('Should respond with URLs', function() {
            plugin.handlers['privmsg']({
                message: 'hello world',
                nickname: 'tester',
                channel: '#helloworld'
            });
            plugin.handlers['privmsg']({
                message: 'ra/http:////www.google.com world',
                nickname: 'smith',
                channel: '#helloworld'
            })
            .then(function(correctedMessage){
                assert.ok(correctedMessage.indexOf('\u0002http://www.google.com world\u0002') > -1);
            });
        });
    
        it('Should fail with missing slashes', function() {
            plugin.handlers['privmsg']({
                message: 'ra',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.undefined();
        });
    
        it('Should use middleware.', function() {
            plugin.exports.addMiddleware(function() {
                return 42;
            });
            plugin.handlers['privmsg']({
                message: 'ra/hello',
                nickname: 'smith',
                channel: '#helloworld'
            }).should.eventually.be.equal(42);
        });        
        
    });

});