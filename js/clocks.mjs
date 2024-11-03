
function isDayClock(clock) {
  return (clock.name ?? clock.label) === "Day Clock";
}

function OnRenderClockPanel(clockPanel, html) {
  const clock = clockPanel.clocks.find(isDayClock);
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

function OnPreUpdateSetting(setting, update, metadata, userId) {
  if (setting.key !== "ptr2e.clocks") return;
  const updateJs = JSON.parse(update.value);

  const originalDayClock = setting.value.clocks.find(isDayClock);
  const newDayClock = updateJs.clocks.find(isDayClock);

  if (!originalDayClock || !newDayClock) return;
  if (originalDayClock.value == newDayClock.value) return;

  if (originalDayClock.value == originalDayClock.max && newDayClock.value == 0) {
    // it's a brand new day!
    Dialog.confirm({
      title: "New Day: Roll Luck?",
      content: "Roll luck for all [Ace] characters?",
      yes: ()=>{
        const aces = game.actors.filter(a=>a.system.traits.has("ace"));
        aces.forEach(actor=>actor.system.skills.get("luck")?.endOfDayLuckRoll?.());
      },
      no: ()=>undefined,
    });
  }
}



export function register() {

  Hooks.on("renderClockPanel", OnRenderClockPanel);
  Hooks.on("preUpdateSetting", OnPreUpdateSetting);
};