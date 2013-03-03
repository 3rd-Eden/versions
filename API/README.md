# API documentation

### Versions.version
<p>The current running version of Versions</p>

---

### Versions.async
<p>Async helper.</p>

---

### Versions.read(path _String_)
<p>Read in a configuration file and merge it with our internal configuration.</p>


#### Arguments

- **path** _String_ 

---

### Versions.listen(port _Number_, callback _Function_)
<p>Listen instructs Versions to setup the static server. This function should<br />only be called once you are done with all your modifications.</p>

#### Arguments

- **port** _Number_ Optional port number, if you didn't set in a config file
- **callback** _Function_ Callback for when the server has started

---

### Versions.allows(what _String_, req _Request_)
<p>Checks if the client allows <code>x</code> based on the details from the given<br />request.</p>

#### Arguments

- **what** _String_ What do we need to test for
- **req** _Request_ HTTP server request

---

### Versions.get(key _String_)
<p>Read out the configuration.</p>

#### Arguments

- **key** _String_ 

---

### Versions.set(key _String_, to _Mixed_)
<p>Updates a configuration value and emits a <code>change:&lt;key&gt;</code> event.</p>

#### Arguments

- **key** _String_ Configuration property that needs to be updated
- **to** _Mixed_ The new value

---

### Versions.merge(target _Object_, additional _Object_)
<p>Merge in objects.</p>

#### Arguments

- **target** _Object_ The object that receives the props
- **additional** _Object_ Extra object that needs to be merged in the target

---

### Versions.forEach(collection _Mixed_, iterator _Function_)
<p>Iterate over a collection. When you return false, it will stop the iteration.</p>

#### Arguments

- **collection** _Mixed_ Either an Array or Object.
- **iterator** _Function_ Function to be called for each item

---

### Versions.connect(server _String_, options _Object_)
<p>Establish a connection with a Versions server so it can sync version numbers<br />between the server and clients.</p>

#### Arguments

- **server** _String_ The domain name of the Versions server.
- **options** _Object_ Connection options.

---

### Versions.end(callback _Function_)
<p>Clean up all internal connections and references.</p>

#### Arguments

- **callback** _Function_ 
