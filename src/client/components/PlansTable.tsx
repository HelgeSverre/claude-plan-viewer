import type { Plan, SortKey, SortDir } from "../types.ts";
import { PlanRow } from "./PlanRow.tsx";

interface PlansTableProps {
  plans: Plan[];
  selectedPlan: Plan | null;
  searchQuery: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onSelectPlan: (plan: Plan) => void;
  onSort: (key: SortKey) => void;
}

export function PlansTable({
  plans,
  selectedPlan,
  searchQuery,
  sortKey,
  sortDir,
  onSelectPlan,
  onSort,
}: PlansTableProps) {
  const getSortClass = (key: SortKey) => {
    if (sortKey === key) {
      return `sorted ${sortDir}`;
    }
    return "";
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th
              data-sort="title"
              className={getSortClass("title")}
              onClick={() => onSort("title")}
            >
              Title <span className="sort-icon">▲</span>
            </th>
            <th className="no-sort">Filename</th>
            <th
              data-sort="project"
              className={getSortClass("project")}
              onClick={() => onSort("project")}
            >
              Project <span className="sort-icon">▲</span>
            </th>
            <th
              data-sort="size"
              className={`num-col ${getSortClass("size")}`}
              onClick={() => onSort("size")}
            >
              Size <span className="sort-icon">▲</span>
            </th>
            <th
              data-sort="lines"
              className={`num-col ${getSortClass("lines")}`}
              onClick={() => onSort("lines")}
            >
              Lines <span className="sort-icon">▲</span>
            </th>
            <th
              data-sort="modified"
              className={getSortClass("modified")}
              onClick={() => onSort("modified")}
            >
              Modified <span className="sort-icon">▲</span>
            </th>
            <th
              data-sort="created"
              className={getSortClass("created")}
              onClick={() => onSort("created")}
            >
              Created <span className="sort-icon">▲</span>
            </th>
          </tr>
        </thead>
        <tbody id="plans-table">
          {plans.map((plan) => (
            <PlanRow
              key={plan.filename}
              plan={plan}
              selected={selectedPlan?.filename === plan.filename}
              searchQuery={searchQuery}
              onSelect={onSelectPlan}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
