import type { ProfileFilters } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const filterOptions = {
  religion: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"],
  caste: ["Brahmin", "Maratha", "Nair", "Agarwal", "Reddy", "Menon", "Khatri", "Rajput"],
  education: ["B.Tech", "MBA", "M.Arch", "MBBS", "CA", "LLB", "M.Tech", "B.E"],
  occupation: [
    "Software Engineer",
    "Product Manager",
    "Architect",
    "Physician",
    "Chartered Accountant",
    "Data Scientist",
    "Corporate Lawyer",
    "Business Owner",
  ],
  incomeRange: ["₹0–5 LPA", "₹5–9 LPA", "₹9–12 LPA", "₹12–18 LPA", "₹18–25 LPA", "₹25 LPA+"],
  city: ["Bengaluru", "Pune", "Kochi", "New Delhi", "Hyderabad", "Chennai", "Mumbai", "Jaipur"],
  maritalStatus: [
    { value: "never_married", label: "Never married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widowed" },
    { value: "awaiting_divorce", label: "Awaiting divorce" },
  ],
} as const;

const ANY = "any";

interface FilterPanelProps {
  value: ProfileFilters;
  onChange: (filters: ProfileFilters) => void;
  onReset: () => void;
  /** Advanced fields are gated by the backend-provided subscription permission. */
  advancedEnabled?: boolean;
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: {
  label: string;
  value?: string | undefined;
  options: readonly string[] | readonly { value: string; label: string }[];
  onValueChange: (value: string | undefined) => void;
  disabled?: boolean | undefined;
}) {
  const normalized = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? ANY}
        disabled={disabled ?? false}
        onValueChange={(next) => onValueChange(next === ANY ? undefined : next)}
      >
        <SelectTrigger className="h-11 rounded-xl">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any</SelectItem>
          {normalized.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterPanel({
  value,
  onChange,
  onReset,
  advancedEnabled = true,
}: FilterPanelProps) {
  const set = (patch: Partial<ProfileFilters>) => onChange({ ...value, ...patch, page: 1 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ageMin" className="text-xs text-muted-foreground">
            Age from
          </Label>
          <Input
            id="ageMin"
            type="number"
            inputMode="numeric"
            min={18}
            max={80}
            className="h-11 rounded-xl"
            value={value.ageMin ?? ""}
            onChange={(event) =>
              set({ ageMin: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ageMax" className="text-xs text-muted-foreground">
            Age to
          </Label>
          <Input
            id="ageMax"
            type="number"
            inputMode="numeric"
            min={18}
            max={80}
            className="h-11 rounded-xl"
            value={value.ageMax ?? ""}
            onChange={(event) =>
              set({ ageMax: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>

      <FilterSelect
        label="Looking for"
        value={value.gender}
        options={[
          { value: "female", label: "Bride" },
          { value: "male", label: "Groom" },
        ]}
        onValueChange={(next) => set({ gender: next as ProfileFilters["gender"] })}
      />
      <FilterSelect
        label="Religion"
        value={value.religion}
        options={filterOptions.religion}
        onValueChange={(religion) => set({ religion })}
      />
      <FilterSelect
        label="Caste / community"
        value={value.caste}
        options={filterOptions.caste}
        onValueChange={(caste) => set({ caste })}
      />
      <FilterSelect
        label="Marital status"
        value={value.maritalStatus}
        options={filterOptions.maritalStatus}
        onValueChange={(next) => set({ maritalStatus: next as ProfileFilters["maritalStatus"] })}
      />
      <FilterSelect
        label="City"
        value={value.city}
        options={filterOptions.city}
        onValueChange={(city) => set({ city })}
      />

      <div className="space-y-4 rounded-2xl border border-border p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Advanced filters
        </p>
        {!advancedEnabled ? (
          <p className="text-xs text-muted-foreground">
            Advanced filters are available on Gold and Platinum memberships.
          </p>
        ) : null}
        <FilterSelect
          label="Education"
          value={value.education}
          disabled={!advancedEnabled}
          options={filterOptions.education}
          onValueChange={(education) => set({ education })}
        />
        <FilterSelect
          label="Occupation"
          value={value.occupation}
          disabled={!advancedEnabled}
          options={filterOptions.occupation}
          onValueChange={(occupation) => set({ occupation })}
        />
        <FilterSelect
          label="Annual income"
          value={value.incomeRange}
          disabled={!advancedEnabled}
          options={filterOptions.incomeRange}
          onValueChange={(incomeRange) => set({ incomeRange })}
        />
      </div>

      <Button variant="neutral" className="w-full" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
