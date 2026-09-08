import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ModelQuality } from "./model-quality";
const options = [
  { value: "original", label: "Detalhes originais" },
  { value: "light", label: "Leve · preserva estruturas" },
];
export function ModelQualityControl({
  value,
  onChange,
}: {
  value: ModelQuality;
  onChange: (quality: ModelQuality) => void;
}) {
  return (
    <div className="model-quality-control">
      <Select
        items={options}
        value={value}
        onValueChange={(v) => {
          if (v === "original" || v === "light") onChange(v);
        }}
      >
        <SelectTrigger aria-label="Qualidade do modelo 3D">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
