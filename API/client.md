# Client API documentation

### Versions.tag(url _String_)
<p>Tag automatically spreads your resources across a different aliased servers<br />to increase parallel downloading of assets.</p>

#### Arguments

- **url** _String_ URL for the version number.

---

### Versions.prefix(server _String_)
<p>Generate a prefix for a asset. This is the combination of server and<br />version number.</p>

#### Arguments

- **server** _String_ Optional server name that it should use to prefix

---

### Versions.version(number _String_, callback _Function_)
<p>Set's a new version number on the server.</p>

#### Arguments

- **number** _String_ New version number
- **callback** _Function_ Continuation
