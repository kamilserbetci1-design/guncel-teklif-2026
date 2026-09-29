import type { Proposal, ProposalItem } from '@/lib/types';
import { foldSearchText } from '@/lib/product-search';

export function baseProposalNo(no: string) {
  return String(no || '').replace(/\/R\d*$/i, '').trim();
}

export function proposalRevision(no: string) {
  const m = String(no || '').trim().match(/\/R(\d+)$/i);
  return m ? Math.max(1, Number(m[1]) || 1) : 1;
}

export function formatRevisionNo(base: string, revision: number) {
  const b = baseProposalNo(base);
  if (!b) return b;
  return revision > 1 ? `${b}/R${revision}` : b;
}

export function nextRevisionNo(currentNo: string, proposals: Proposal[]) {
  const base = baseProposalNo(currentNo);
  let max = 1;
  for (const p of proposals) {
    if (baseProposalNo(p.proposal_no) === base) {
      max = Math.max(max, proposalRevision(p.proposal_no));
    }
  }
  return formatRevisionNo(base, max + 1);
}

export function cloneProposalItems(items: ProposalItem[] | undefined): ProposalItem[] {
  return (items || []).map((item) => ({
    ...item,
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

const plainName = (value: string) =>
  (value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export function proposalMatchesCustomer(p: Proposal, c: { name: string; phone?: string }) {
  const aName = foldSearchText(plainName(p.customer_name || ''));
  const bName = foldSearchText(plainName(c.name || ''));
  const aPhone = String(p.customer_phone || '').replace(/\D/g, '');
  const bPhone = String(c.phone || '').replace(/\D/g, '');
  if (bName && aName === bName) return true;
  if (bPhone.length >= 7 && aPhone === bPhone) return true;
  return false;
}

export function lastProposalForCustomer(
  proposals: Proposal[],
  brandId: string,
  c: { name: string; phone?: string }
) {
  return (
    proposals
      .filter((p) => p.brand_id === brandId && proposalMatchesCustomer(p, c))
      .sort((a, b) => {
        const da = a.updated_at || a.created_at || a.proposal_date || '';
        const db = b.updated_at || b.created_at || b.proposal_date || '';
        if (da !== db) return db.localeCompare(da);
        return String(b.id).localeCompare(String(a.id));
      })[0] || null
  );
}

export function groupProposalsByRevision(list: Proposal[]) {
  const map = new Map<string, Proposal[]>();
  const order: string[] = [];
  for (const p of list) {
    const key = baseProposalNo(p.proposal_no) || p.id;
    if (!map.has(key)) {
      order.push(key);
      map.set(key, []);
    }
    map.get(key)!.push(p);
  }
  return order.map((key) => {
    const items = map.get(key) || [];
    const revisions = [...items].sort(
      (a, b) =>
        proposalRevision(b.proposal_no) - proposalRevision(a.proposal_no) ||
        String(b.id).localeCompare(String(a.id))
    );
    return { key, latest: revisions[0], revisions };
  });
}
