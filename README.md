# tennu-correction

A plugin for the [tennu](https://github.com/Tennu/tennu) irc framework.

Search and replace text in previous messages.

## Examples
- 8:22 Havvy: Hello world
- 8:23 Ownix: s/world/mars
- 8:24 Bot: Correction, <Havvy> Hello **mars**

### Configuration

```javascript
"correction": {
    "lookBackLimit": 60, // memory usage caution, id keep this number reasonable.
},
```

### Exports
````addMiddleware()````: Lets you decide what happens after someone does s/whatever/everwhat

### Installing Into Tennu

See Downloadable Plugins [here](https://tennu.github.io/plugins/).

### Todo:

- Tests
