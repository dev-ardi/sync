## Considerations
### Handled cases

- If there are two processes that claim to have the same master priority the oldest one will be chosen
- All processes will start as master nodes and will be demoted when a master node is found.
- If there are two master processes with the exact same starting time, which is used for leadership election the thread will restart. This is handled.


### Unhandled cases
- The machine cannot spawn threads
- The machine cannot open sockets
- Bad configuration is passed to the server.
