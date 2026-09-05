import type { FieldConfig } from "@/config/profile-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DynamicField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.name}`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm">
        {field.label}{" "}
        {field.required ? (
          <span className="text-destructive">*</span>
        ) : (
          <span className="text-xs text-muted-foreground">(optional)</span>
        )}
      </Label>

      {field.type === "select" ? (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-11 rounded-xl">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={4}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          className="rounded-xl"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={field.type === "tel" ? "tel" : field.type}
          inputMode={field.type === "tel" || field.type === "number" ? "numeric" : undefined}
          maxLength={field.maxLength}
          placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
          className="h-11 rounded-xl"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
