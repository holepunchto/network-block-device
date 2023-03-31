# Logs

You can find parsed logs [here](parsed_logs.md)

# Baseline implementation checklist

**Negotiation phase**

 1) Starter message from the server ✅
 
 2) Parsing client flags correctly ❌ 
 
 3) Parsing NBD_OPT_GO, to reply with a NBD_REP_INFO of type NBD_INFO_EXPORT, and NBD_REP_ACK, before starting the transmission phase ❓
 
 4) Parsing NBD_OPT_INFO (the same as NBD_OPT_GO, but without starting the transmission phase) ❓
 
 5) Parsing NBD_OPT_LIST, to reply with an NBD_REP_SERVER for each export offered by the server, and NBD_REP_ACK ❌ 
 
 6) Parsing NBD_OPT_ABORT, to reply with NBD_REP_ACK before shutting down ❌ 
 
 7) Reply to any other option with NBD_REP_ERR_UNSUP ❌ 

**Transmission phase** 

 8) Parsing CMD_READ and reply ❓
 
 9) Parsing CMD_WRITE and reply ❓
 
 10) Parsing CMD_DISC and disconnect ❌ 
 

# Example

I only tried it with the main Linux implementation of the protocol.

**1. Installation**

First of all, you need to install the nbd package, I compiled the version from sourceforge: https://sourceforge.net/projects/nbd/files/

**2. Server terminal**

Then, download the nbd-server package, open it in a terminal, and run

```bash
node app
```

to start the server. By default the app provides a 1024kb export.

**3. Intercepting terminal**

Then, open a second terminal and run this command on the folder:

```bash
node cepter
```

This will start a script that intercepts the server communication, formats it and prints it.

You can skip this part if you don't wanna log the data (for example if you change the size of the export from 1024kb to something much bigger)

**4. Client terminal**

Finally, open another terminal anywhere, and run 

```bash
sudo modprobe nbd && sudo nbd-client -N export1 -unix /tmp/unix100 /dev/nbd0
```

If you skipped point 3, run this instead, to connect the client to the server without intermediaries:

```bash
sudo modprobe nbd && sudo nbd-client -N export1 -unix /tmp/unix10 /dev/nbd0
```

regardless of which option you chose, the client terminal should log

```bash
Negotiation: ..size = 0MB
bs=512, sz=1024 bytes
```
This means the handshake phase was successful.

**5. Writing**

Run this command to write hello world on the block device:

```bash
echo "Hello, world!" | sudo dd of=/dev/nbd0 bs=1 count=13 seek=0 conv=notrunc
```

it should log something like this:
```bash
13+0 records in
13+0 records out
13 bytes copied, 0,000112198 s, 116 kB/s
```

**6. Reading**

Run this command to read from the block device:

```bash
sudo dd if=/dev/nbd0 bs=1 count=13
```

It should log something like this:

```bash
Hello, world!13+0 records in
13+0 records out
13 bytes copied, 9,2174e-05 s, 141 kB/s
```
