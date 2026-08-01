// DONE 1. Add the key degree on each "square" inside the mask: for example in the default C key:
// DONE     - Am: vi
// DONE     - Bdmin: vii° (??)
// DONE     - C: I
// DONE     - Dm: ii
// DONE     - Em: iii
// DONE     - F: IV
// DONE     - G: V

One of the the mask on the circle of fifth's bigger value is that when it moves around, is that the position of the values keeps the same, so we automatically detect all notes, their degree, chord, etc

2. Let's review together the animation effects added to the circle, because the only thing I see is the dashed dot rotating slowly.

3. We need to make it look a bit more like an actual mask and not a line. So lets try casting a strong shadow but with short range. Or some other kind of effect to the parts not inside it.

4. Implement a checkbox to completely hide the mask in the left menu (where you rotate the circle)

5. Remove FOREVER the string "The arrows turn the wheel" that keeps reappearing in the left menu

6. Implement a dashboard to the right of the wheel. It will list all properties that can be infeered about the selected key: chords, relative/minor/major, possible modes (?), dont know music theory enough to list, thats why im buildiung it. 

7. Nausea mode: Add very low opacity "piece of pizza"-shaped colored surfaces that spin together with the slowly spinnning dashed border we have now. They have to be BARELY visible. Some will rotate like 5% faster or -15% to see if we can actually cause nausea with it. The only way to disable it is to hover the mouse in the lower left corner of the page whnile fully scrolled down. That will reveal the checkbox "Stop the world!!!! I wanna get off" that can then be checked off.