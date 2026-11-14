const pilotHourPrice = 800;
const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});
const estimates = { hour: pilotHourPrice, split: pilotHourPrice / 2, monthly: pilotHourPrice * 4 };
for (const amount of document.querySelectorAll('[data-price]')) {
  amount.textContent = money.format(estimates[amount.dataset.price]);
}

const heroPrice = document.querySelector('#hero-price');
if (heroPrice) {
  const withPrice = new URLSearchParams(location.search).get('hero') === 'price';
  heroPrice.hidden = !withPrice;
  document.documentElement.dataset.heroVariant = withPrice ? 'price' : 'plain';
}

const clubFee = document.querySelector('#club-fee');
if (clubFee) {
  const travel = document.querySelector('#club-travel');
  const time = document.querySelector('#club-time');
  const comparison = document.querySelector('#club-comparison');
  clubFee.closest('details').addEventListener('input', () => {
    if ([clubFee, travel, time].some((input) => !input.validity.valid)) {
      comparison.textContent = 'Введи суммы и время от нуля.';
      return;
    }
    if (!clubFee.value) {
      comparison.textContent = 'Укажи стоимость абонемента для расчёта на четыре визита.';
      return;
    }
    const total = clubFee.valueAsNumber + 4 * (travel.valueAsNumber || 0);
    const minutes = time.value ? ' · ' + Math.round(time.valueAsNumber * 4) + ' мин на дорогу' : '';
    comparison.textContent = 'Клуб: ' + money.format(total) + minutes + '. Зал на час: ориентир ' + money.format(estimates.monthly) + ' за четыре визита.';
  });
}
