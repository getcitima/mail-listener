# Overview

mail-listener library for node.js. Get notification when new email arrived to inbox or when message metadata (e.g. flags) changes externally. Uses IMAP protocol.

We are using these libraries: [node-imap](https://github.com/mscdex/node-imap), [mailparser](https://github.com/nodemailer/mailparser).

Heavily inspired by [mail-listener2](https://github.com/chirag04/mail-listener2) and [mail-listener5](https://github.com/Pranav-Dakshina/mail-listener2).

NOTE: This version is designed to work with & tested on NodeJS v 10.15.2 LTS, the most recent LTS version as at March 2019. It might not work on older versions of Node.

## Use

Install

`npm install @digital-garage-to/mail-listener`

```javascript

const MailListener = require('mail-listener');

const mailListener = new MailListener({
  imapOptions: {
    username: 'imap-username',
    password: 'imap-password',
    host: 'imap-host',
    port: 993, // imap port
    tls: true,
    connTimeout: 10000, // Default by node-imap
    authTimeout: 5000, // Default by node-imap,
    debug: console.log, // Or your custom function with only one incoming argument. Default: null
    tlsOptions: { rejectUnauthorized: false },
  },
  mailbox: 'INBOX', // mailbox to monitor
  searchFilter: ['ALL'], // the search filter being used after an IDLE notification has been retrieved
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  attachments: true, // download attachments as they are encountered to the project directory
  attachmentOptions: {
    directory: 'attachments/', // specify a download directory for attachments
    customFilename: (directory, attachment) => {
      return `${directory}test/${attachment.filename}`;
    };
  }
});

mailListener.start(); // start listening
mailListener.stop(); // stop listening

mailListener.on('server:connected', () => {
  console.log('imap connected');
});

mailListener.on('mailbox', mailbox => {
  console.log('Total number of mails: ', mailbox.messages.total); // this field in mailbox gives the total number of emails
});

mailListener.on('server:disconnected', () => {
  console.log('imap disconnected');
});

mailListener.on('error', err => {
  console.log('Error: ', err);
});

mailListener.on('headers', (headers, seqno) => {
  // do something with mail headers
});

mailListener.on('body', (body, seqno) => {
  // do something with mail body
})

mailListener.on('attachment', (attachment, seqno) => {
  // do something with attachment
});

mailListener.on('mail', (mail, seqno) => {
  // do something with the whole email as a single object
})

// it's possible to access imap object from node-imap library for performing additional actions. E.x.
mailListener.imap.move(:msguids, :mailboxes);

```

## Attachments

Setting `attachments: true` will download attachments as stream to the project directory.
A specific download directory may be specified by setting `attachmentOptions: { directory: 'attachments/'}`.
The `'attachment'` event will be fired every time an attachment is encountered.
To customize the name of file downloaded specific a `customFilename` function.

## License

MIT
