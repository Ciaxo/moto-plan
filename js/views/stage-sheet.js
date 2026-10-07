import { remove, save } from '../db.js';
import { nextOrder } from '../lib/order.js';
import { editRecord } from '../lib/pack.js';
import { button, element, field } from '../ui/elements.js';
import { closeSheet, onSubmit, openConfirm, openSheet } from '../ui/sheet.js';

const newStage = { origin: 'user', packId: null, userModified: false, headline: '' };

export function openStageSheet(plan, entry) {
  const stage = entry?.stage;
  const title = Object.assign(element('input', 'input'), {
    name: 'title',
    required: true,
    pattern: '.*\\S.*',
    placeholder: 'np. Teoria',
    value: stage?.title ?? '',
    autofocus: !stage,
  });
  const period = Object.assign(element('input', 'input'), {
    name: 'period',
    placeholder: 'np. wiosna 2027',
    value: stage?.period ?? '',
  });
  const submit = element('button', 'button button-primary', 'Zapisz etap');
  submit.type = 'submit';
  const form = element('form', 'form');
  form.append(
    field('Tytuł', title),
    field('Okres', period),
    submit,
    button('Anuluj', 'button', closeSheet),
  );
  if (entry?.steps.length > 0) {
    form.append(element('p', null, 'Najpierw usuń albo przenieś kroki tego etapu.'));
  } else if (entry) {
    form.append(button('Usuń etap', 'button button-secondary', () => confirmRemove(stage)));
  }
  onSubmit(form, () => saveStage(plan, stage, { title: title.value, period: period.value }));
  openSheet(stage ? 'Edytuj etap' : 'Nowy etap', form);
}

async function saveStage(plan, stage, changes) {
  const order = nextOrder(plan.map((entry) => entry.stage));
  const record = stage
    ? editRecord('stages', stage, changes)
    : { ...newStage, ...changes, order, id: crypto.randomUUID() };
  if (record) {
    await save('stages', record);
  }
}

function confirmRemove(stage) {
  openConfirm('Usunąć etap?', `Etap „${stage.title}" zniknie z planu.`, 'Usuń etap', async () => {
    await remove('stages', stage.id);
    closeSheet();
    // The stage is gone after the redraw, so focus moves to a button that stays on the screen.
    document.querySelector('[data-id="add-stage"]').focus();
  });
}
