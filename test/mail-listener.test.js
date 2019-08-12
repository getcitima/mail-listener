const MailListener = require('../lib');

const expect = require('./helpers/expect');

describe('MailListener', () => {
  it('Invalid attachments directory should report error', () => {
    expect(() => new MailListener({
      attachments: true,
      attachmentOptions: {
        directory: {},
      },
    })).throw('invalid attachments directory');
  });
});
