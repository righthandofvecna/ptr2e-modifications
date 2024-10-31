



// function OnRenderClockEditor(clockEditor, html) {
//   const putInside = html.querySelector("main fieldset");

//   $(putInside).append(`<div class="form-group"><label>Day Clock?</label><div class="form-fields"><input type="checkbox" name="dayClock"></div><p class="hint">Whether or not this is a day clock.</p></div>`);


//   console.log(...arguments);
// };


function OnRenderClockPanel(clockPanel, html) {
  const clock = clockPanel.clocks.find(clock=>clock.name === "Day Clock");
  const clockId = clock?.id;
  if (!clockId) return;
  const dayClock = $(html).find(`.clock-list .clock-entry[data-id="${clockId}"]`);
  if (!dayClock) return;
  $(dayClock).addClass("day-clock");
  // TODO: update the displayed text
  const [ label, timeClass ] = (()=>{
    switch (clock.value) {
      case 0: return [ "Morning", "morning" ];
      case 1: return [ "Daytime", "daytime" ];
      case 2: return [ "Afternoon", "afternoon" ];
      case 3: return [ "Evening", "evening" ];
      case 4: return [ "Night", "night" ];
    }
    return [ "Unknown", "unknown" ];
  })();
  
  $(dayClock).addClass(timeClass);
  $(dayClock).find(".name-section .name").text(label);
  const clockHtml = $(dayClock).find(".clock");
  $(clockHtml).css("--areas", 5).css("--filled", parseInt($(clockHtml).css("--filled")) + 1).append("<div class='spoke' style='--index: 4'></div>");
};



export function register() {

  // Hooks.on("renderClockEditor", OnRenderClockEditor);
  Hooks.on("renderClockPanel", OnRenderClockPanel);
};