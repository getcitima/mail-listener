const Imap = require('imap');
const {EventEmitter} = require('events');
const {MailParser} = require('mailparser');
const fs = require('fs');
const async = require('async');

class MailListener extends EventEmitter {
  constructor(options) {
    super();
    this.markSeen = !!options.markSeen;
    this.mailbox = options.mailbox || 'INBOX';

    if ('string' === typeof options.searchFilter) {
      this.searchFilter = [options.searchFilter];
    } else {
      this.searchFilter = options.searchFilter || ['UNSEEN'];
    }

    this.fetchOnStart = !!options.fetchOnStart;
    this.mailParserOptions = options.mailParserOptions || {};

    this.attachments = !!options.attachments;
    this.attachmentOptions = options.attachmentOptions || {};

    if (this.attachments) {
      const {directory} = this.attachmentOptions;
      if ('string' !== typeof directory) {
        const error = new Error('invalid attachments directory');
        throw error;
      }

      if (!directory.endsWith('/')) {
        this.attachmentOptions.directory = `${directory}/`;
      }
    }

    const imapOptions = options.imapOptions || {};
    const {username} = imapOptions;

    if (username) {
      imapOptions.user = username;
    }

    this.imap = new Imap(imapOptions);

    this.imap.once('ready', () => this.imapReady());
    this.imap.once('close', () => this.imapClose());
    this.imap.on('error', error => this.imapError(error));
  }

  start() {
    this.imap.connect();
  }

  stop() {
    this.imap.end();
  }

  imapReady() {
    this.imap.openBox(this.mailbox, false, (error, mailbox) => {
      if (error) {
        this.emit('error', error);
      } else {
        this.emit('server:connected');
        this.emit('mailbox', mailbox);

        if (this.fetchOnStart) {
          this.search();
        }

        this.imap.on('mail', () => this.imapMail());
        this.imap.on('update', () => this.imapMail());
      }
    });
  }

  imapClose() {
    this.emit('server:disconnected');
  }

  imapError(error) {
    this.emit('error', error);
  }

  imapMail() {
    this.search();
  }

  search() {
    const self = this;
    self.imap.search(self.searchFilter, (error, results) => {
      if (error) {
        self.emit('error', error);
      } else if (results.length > 0) {
        async.each(results, (result, callback) => {
          const f = self.imap.fetch(result, {
            bodies: '',
            markSeen: self.markSeen,
          });

          f.on('message', (message, sequenceNumber) => {
            message.on('body', (stream, info) => {
              const chunks = [];
              let bodyEmail, headersEmail;
              const attachmentsEmail = [];

              const parser = new MailParser(self.mailParserOptions);

              parser.on('headers', headers => {
                headersEmail = headers;
                self.emit('headers', headers, sequenceNumber);
              });
              parser.on('data', data => {
                if (data.type === 'text') {
                  bodyEmail = data;
                  self.emit('body', data, sequenceNumber);
                } else if (data.type === 'attachment') {
                  if (this.attachments) {
                    const {directory, customFilename} = this.attachmentOptions;
                    const filename = 'function' === typeof customFilename ?
                      customFilename(data) : data.filename;

                    const filePath = 'string' === typeof directory ?
                      directory + filename : filename;

                    const writeStream = fs.createWriteStream(filePath);

                    data.content.pipe(writeStream);

                    data.content.on('end', () => {
                      data.release();
                      data.path = filePath;
                      data.filename = filename;
                      attachmentsEmail.push(data);
                      self.emit('attachment', data, sequenceNumber);
                    });

                    data.content.on('error',
                      error => self.emit('error', error));
                    writeStream.on('error', error =>
                      self.emit('error', error));
                  } else {
                    attachmentsEmail.push(data);
                    self.emit('attachment', data, sequenceNumber);
                  }
                }
              });
              parser.on('end', () => self.emit('mail', {
                body: bodyEmail,
                headers: headersEmail,
                attachments: attachmentsEmail,
              }, sequenceNumber));

              stream.on('data', chunk => chunks.push(chunk));
              stream.on('error',
                error => self.emit('error', error, sequenceNumber));
              stream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                parser.write(buffer);
                parser.end();
              });
            });
          });

          f.once('error', error => {
            self.emit('error', error);
          });
        }, error => {
          if (error) {
            self.emit('error', error);
          }
        });
      }
    });
  }
}

module.exports = MailListener;
