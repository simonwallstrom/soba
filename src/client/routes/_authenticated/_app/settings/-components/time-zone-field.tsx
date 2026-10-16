import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@client/components/ui/combobox";
import { useMemo } from "react";

// "America/Argentina/Buenos_Aires" reads as "Buenos Aires", in "America".
function describe(timeZone: string, now: Date) {
  const parts = timeZone.split("/");
  const offset = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  return {
    city: (parts.at(-1) ?? timeZone).replaceAll("_", " "),
    region: parts.length > 1 ? parts[0] : null,
    offset: offset ?? "",
  };
}

// Every time zone the browser knows, described as of now.
function listTimeZones(current: string) {
  const now = new Date();
  const names = Intl.supportedValuesOf("timeZone");
  // Browsers leave out "UTC", which is where households start.
  if (!names.includes(current)) names.push(current);
  return new Map(names.map((name) => [name, describe(name, now)]));
}

/** A searchable list of every time zone, since there are hundreds. */
export function TimeZoneField({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (timeZone: string) => void;
  value: string;
}) {
  const zones = useMemo(() => listTimeZones(value), [value]);

  return (
    <Combobox
      autoHighlight
      itemToStringLabel={(name: string) => zones.get(name)?.city ?? name}
      items={[...zones.keys()]}
      onValueChange={(name: string | null) => {
        if (name && name !== value) onChange(name);
      }}
      value={value}
    >
      <ComboboxInput className="sm:w-52" id={id} placeholder="Search cities…" />
      {/* Wider than the field, so the region and offset fit beside the city. */}
      <ComboboxContent className="w-80">
        <ComboboxEmpty>No time zones match.</ComboboxEmpty>
        <ComboboxList className="max-h-64">
          {(name: string) => {
            const zone = zones.get(name);
            return (
              <ComboboxItem key={name} value={name}>
                {zone?.city ?? name}
                <span className="pl-2 text-olive-500">
                  {[zone?.region, zone?.offset].filter(Boolean).join(" · ")}
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
