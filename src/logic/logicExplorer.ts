export class ExplorerLogic {
  selectedIds = new Set<string>();
  expandedIds = new Set<string>();
  scrollTop = 0;
  search = '';

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  expand(id: string): void { this.expandedIds.add(id); }
  collapse(id: string): void { this.expandedIds.delete(id); }
  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
  }
  setSearch(q: string): void { this.search = q; }
  clearSelection(): void { this.selectedIds.clear(); }
}
