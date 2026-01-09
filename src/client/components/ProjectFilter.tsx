import Select, { type MultiValue } from "react-select";

interface ProjectFilterProps {
  projects: string[];
  selectedProjects: Set<string>;
  onToggle: (project: string) => void;
  onClear: () => void;
}

export function ProjectFilter({
  projects,
  selectedProjects,
  onToggle,
  onClear,
}: ProjectFilterProps) {
  const options = projects.map((p) => ({ value: p, label: p }));

  const selectedOptions = projects
    .filter((p) => selectedProjects.has(p))
    .map((p) => ({ value: p, label: p }));

  const handleChange = (
    newValue: MultiValue<{ value: string; label: string }> | null,
  ) => {
    const selectedSet = new Set((newValue ?? []).map((option) => option.value));

    projects.forEach((project) => {
      const isSelected = selectedSet.has(project);
      const wasSelected = selectedProjects.has(project);
      if (isSelected !== wasSelected) {
        onToggle(project);
      }
    });
  };

  const customStyles = {
    control: (base: object, state: { isFocused: boolean }) => ({
      ...base,
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      minHeight: "28px",
      fontSize: "11px",
      color: "var(--text-secondary)",
      boxShadow: "none",
      cursor: "pointer",
      transition: "border-color 0.15s, box-shadow 0.15s",
      "&:hover": {
        borderColor: "var(--border-light)",
      },
      ...(state.isFocused
        ? {
            borderColor: "var(--accent)",
            boxShadow: "var(--focus-ring)",
          }
        : {}),
    }),
    placeholder: (base: object) => ({
      ...base,
      color: "var(--text-muted)",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    }),
    dropdownIndicator: (base: object) => ({
      ...base,
      color: "var(--text-muted)",
      padding: "4px 6px",
      "&:hover": {
        color: "var(--text-secondary)",
      },
    }),
    clearIndicator: (base: object) => ({
      ...base,
      color: "var(--text-muted)",
      padding: "4px",
      "&:hover": {
        color: "var(--text-primary)",
      },
    }),
    menu: (base: object) => ({
      ...base,
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
      marginTop: "4px",
      overflow: "hidden",
      zIndex: 60,
    }),
    menuList: (base: object) => ({
      ...base,
      padding: "4px",
      maxHeight: "280px",
    }),
    option: (
      base: object,
      state: { isSelected: boolean; isFocused: boolean },
    ) => ({
      ...base,
      background: state.isSelected
        ? "var(--accent-dim)"
        : state.isFocused
          ? "var(--bg-hover)"
          : "transparent",
      color: "var(--text-primary)",
      fontSize: "12px",
      cursor: "pointer",
      borderRadius: "var(--radius-sm)",
      padding: "6px 8px",
      margin: "0 2px",
      "&:active": {
        background: "var(--bg-hover)",
      },
    }),
    multiValue: (base: object) => ({
      ...base,
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
    }),
    multiValueLabel: (base: object) => ({
      ...base,
      color: "var(--text-primary)",
      fontSize: "10px",
      fontFamily: "ui-monospace, SFMono-Regular, monospace",
      padding: "2px 4px",
    }),
    multiValueRemove: (base: object) => ({
      ...base,
      color: "var(--text-muted)",
      padding: "0 2px",
      "&:hover": {
        background: "transparent",
        color: "var(--text-primary)",
      },
    }),
    noOptionsMessage: (base: object) => ({
      ...base,
      color: "var(--text-muted)",
      fontSize: "12px",
    }),
    indicatorSeparator: (base: object) => ({
      ...base,
      backgroundColor: "var(--border)",
    }),
  };

  const selectedCount = selectedProjects.size;

  return (
    <div className="project-select-wrapper">
      <Select
        isMulti
        options={options}
        value={selectedOptions}
        onChange={handleChange}
        styles={customStyles}
        placeholder={
          <span>
            Projects
            {selectedCount > 0 && (
              <span className="project-badge">{selectedCount}</span>
            )}
          </span>
        }
        noOptionsMessage={() => "No projects"}
        isClearable={true}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        controlShouldRenderValue={false}
      />
    </div>
  );
}
