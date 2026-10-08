# Build Log

A plain-English diary of every change made to Chromatic Data Prism.

---

## 8 October 2026, 23:55 (UTC+1): First version of the app

**What was built**

We created the whole app from scratch: a single web page that turns text and data into light passing through a glass prism.

**The glass prism**
- A 3D triangular glass prism sits in the middle of the screen. It looks like real glass: it bends what's behind it, has soft rainbow fringes at its edges, and catches reflections from invisible studio lights.
- A beam of white light shines into the prism. The app works out the beam's path with real optics rules (the same maths used for lenses and diamonds). The light splits into nine colours, can bounce around inside the glass, and comes out as a rainbow.
- Shimmering, water-like light patterns (called caustics) ripple across the floor, and a faint arc of coloured light strands behind the prism gives the glass something to bend.
- You can drag to spin the camera around the prism, scroll to zoom and right-drag to slide the view.

**Turning data into light**
- There are three ways to feed in data: type text, paste a JSON log (a common format for computer records), or turn on "Live Pulse", a made-up stream of server log messages that arrives every second or so.
- Every time the input changes, the app creates a short "fingerprint" of it and uses that to choose four light settings: the angle the light comes in at, its main colour, how strongly the glass bends light, and how many times the light bounces inside before escaping. It also sets how widely the colours spread apart.
- The same input always gives the same light, and even a one-letter change gives a different result. For JSON, extra spaces and line breaks are ignored, so the same log always looks the same.
- Spaces and line breaks still count towards the fingerprint, but they add no colour.

**Two viewing modes**
- **Utility / Diagnostic mode** shows the controls on the left and a dashboard on the right. The dashboard has a dial for the light angle, a colour swatch for the wavelength, a scale comparing the glass to water, normal glass, sapphire and diamond, a counter for bounces, a bar chart showing which kinds of characters are in your data, a table showing what happened to each colour of light, a history graph, and a secure SHA-256 fingerprint of the input.
- **Art / Ambient mode** hides all the controls, makes the light patterns fill the whole scene, adds more glow, and slowly circles the camera around the prism. When you switch back, the camera glides home to the front view.
- Press the **M** key to switch between modes.

**Presets (one-click scenes)**
- **Crypto Key Prism** creates a brand-new random 256-bit security key in your browser and turns it into light. You can make a new key or have it change every 4 seconds.
- **Live CPU Temperature** estimates how hot your computer is working, based on how smoothly the page is running, and shows cool as blue and hot as red. Browsers can't read real temperature sensors, so this is clearly labelled as an estimate.
- **Generative Rainbow Ambient** is a never-ending, slowly changing light show that moves through every colour. It switches to Art mode automatically.

**Safety and privacy**
- Everything happens in your own browser. Nothing you type is sent over the internet or saved.
- Random keys use the browser's secure random number generator.
- A `.gitignore` file was added so secret files (passwords, keys, environment settings), logs and build output are never accidentally shared.
- The dependency security check (`npm audit`) found no known problems. The Snyk code scanner couldn't run because it needs a Snyk account sign-in, so we checked the code by hand for common risky patterns and found none.

**Fixes made while testing**
- The light beams didn't show up at first. A development safety feature in React was building them twice, and the second copy stole the beams from the first. They are now built in a single step.
- The beams were too thick and bright and washed out the scene, so they were made thinner and softer.
- The rainbow patch on the floor had a hard, blocky edge, so it now fades in smoothly.
- The coloured strands behind the prism looked like a fence, so they now fade out at the top and bottom.
- The beams' memory is now set up once and reused, so long ambient sessions don't slowly use up graphics memory.
- Reduced a grainy texture on the glass surfaces.

**Tools used**
React, TypeScript, Vite, Tailwind CSS, three.js, React Three Fiber, Drei, React Postprocessing and Zustand.

---

## 9 October 2026, 00:15 (UTC+1): Audio Reactive Mode

**What was added**

The prism can now dance to sound. A new **Enable Audio Reactive Mode** button in the top bar lets the light react to your microphone or to a music file you choose.

**How to use it**
- Click **Enable Audio Reactive Mode**. Browsers only let a web page make or listen to sound after you click something, so this button also "wakes up" the browser's audio system.
- A small panel opens. Pick **Microphone** (your browser will ask for permission) or **Audio file** to choose an MP3, WAV or similar file from your computer. Music files play through your speakers. Microphone sound isn't played back, so there's no squealing feedback.
- Three coloured meters show the sound being split into bass, mids and treble as it plays. A small dot flashes on each detected drum kick.
- Click **Turn off** (or the main button again) to stop. The microphone is released and the music file is cleared from memory.

**What the sound controls**
- **Bass (deep sounds, like kick drums):** the prism gently swells and "breathes" with the beat, the white beam of light gets brighter, the glow increases, and each kick briefly ripples the glass.
- **Mids (voices, guitars, most melody):** make the glass bend light more strongly and spread the rainbow colours further apart. This changes both how the glass looks and the real calculated path of the light.
- **Treble (cymbals, hi-hats, "s" sounds):** make the camera shake slightly, make it circle the prism faster, and add sparkles and rays of light to the shimmering patterns on the floor.
- The levels adjust themselves automatically, so quiet songs and loud rooms both get the full range of movement.
- The sound adds on top of the light settings that come from your text or data. The dashboard keeps showing the data's own values.

**Behind the scenes**
- The new audio code lives in a file called `audioPrismBridge.js`. It uses the browser's built-in Web Audio tools to measure how loud each range of pitches is, 60 times a second.
- The project setup was updated so this JavaScript file is still checked for mistakes like the rest of the code.

**Safety and privacy**
- Sound is only measured, never recorded, saved or sent anywhere.
- Only audio files are accepted, up to 300 MB.
- Folders for personal test recordings (`recordings/`, `test-audio/`) were added to `.gitignore` so private audio is never accidentally shared.
- The Snyk security scanner checked the code and found no issues.

**Fixes made while testing**
- The audio settings panel first appeared behind the input panel. The top bar now sits above everything else.
- The test used a computer-generated drum beat with a tone and hi-hats. It confirmed that bass reacts to the kicks, mids follow the tone and treble rises with the hi-hats, and that turning audio off fully shuts everything down.

---

## 9 October 2026, 00:25 (UTC+1): Privacy check and saved to a private GitHub repository

**Privacy check**
- Every project file was searched for personal information: names, usernames, email addresses, phone numbers, computer folder paths, IP addresses, passwords and secret keys. Nothing was found, so no changes were needed.

**Saved to GitHub**
- The project is now stored in a **private** GitHub repository, so it's backed up and only you can see it.
- Your computer's default git settings would have stamped your real name and personal email address on every saved version. For this project only, they now use your GitHub username and GitHub's anonymous "no-reply" email address instead. Your other projects are unaffected.
- Downloaded libraries (`node_modules`) and build output (`dist`) are left out, as the `.gitignore` file already specified.
- A small settings file (`.gitattributes`) was added so line breaks in text files are saved the same way whether the project is opened on Windows, Mac or Linux.
