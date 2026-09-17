import re

from django.db import migrations, models


PROGRAM_DAY_SUFFIX_PATTERN = re.compile(r"\s*-\s*DIA\s+([A-Z0-9]+)\s*$", re.IGNORECASE)
PROGRAM_TREINO_SUFFIX_PATTERN = re.compile(r"\s*-\s*TREINO\s+([A-Z0-9]+)\s*$", re.IGNORECASE)


def parse_sequence_order(workout_name):
    upper = workout_name.upper()
    for pattern in [
        re.compile(r"DIA\s*([A-Z])"),
        re.compile(r"TREINO\s*([A-Z])"),
    ]:
        match = pattern.search(upper)
        if match:
            code = ord(match.group(1))
            if 65 <= code <= 90:
                return code - 64

    if re.search(r"\bPUSH\b", upper):
        return 1
    if re.search(r"\bPULL\b", upper):
        return 2
    if re.search(r"\bLEGS\b", upper):
        return 3

    single_letter = re.search(r"\b([A-F])\b", upper)
    if single_letter:
        return ord(single_letter.group(1)) - 64

    numeric = re.search(r"\b(\d{1,2})\b", upper)
    if numeric:
        return int(numeric.group(1))

    return 0


def parse_program_base(workout_name):
    for pattern in [PROGRAM_DAY_SUFFIX_PATTERN, PROGRAM_TREINO_SUFFIX_PATTERN]:
        match = pattern.search(workout_name)
        if match:
            return workout_name[:match.start()].strip()
    return workout_name.strip()


def backfill_sequence(apps, schema_editor):
    Workout = apps.get_model('workouts', 'Workout')
    for workout in Workout.objects.all().iterator():
        group = parse_program_base(workout.name)[:120]
        order = parse_sequence_order(workout.name)
        Workout.objects.filter(pk=workout.pk).update(
            sequence_group=group,
            sequence_order=order if order > 0 else 0,
        )

    # Within each user+group, assign missing orders by created_at.
    from collections import defaultdict
    buckets = defaultdict(list)
    for workout in Workout.objects.all().order_by('user_id', 'created_at', 'id'):
        key = (workout.user_id, (workout.sequence_group or '').strip().lower() or 'geral')
        buckets[key].append(workout)

    for workouts in buckets.values():
        used = {w.sequence_order for w in workouts if w.sequence_order > 0}
        next_order = 1
        for workout in workouts:
            if workout.sequence_order > 0:
                continue
            while next_order in used:
                next_order += 1
            Workout.objects.filter(pk=workout.pk).update(sequence_order=next_order)
            used.add(next_order)
            next_order += 1


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0004_exercise_soft_delete_and_constraints'),
    ]

    operations = [
        migrations.AddField(
            model_name='workout',
            name='sequence_group',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Nome do ciclo/programa (ex.: Hipertrofia ABC). Vazio = grupo Geral.',
                max_length=120,
            ),
        ),
        migrations.AddField(
            model_name='workout',
            name='sequence_order',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Ordem no ciclo (1, 2, 3…). 0 = sem ordem explícita (cai no fim).',
            ),
        ),
        migrations.AlterModelOptions(
            name='workout',
            options={
                'ordering': ['sequence_order', 'name', '-created_at'],
                'verbose_name': 'Treino',
                'verbose_name_plural': 'Treinos',
            },
        ),
        migrations.AddIndex(
            model_name='workout',
            index=models.Index(
                fields=['user', 'is_active', 'sequence_group', 'sequence_order'],
                name='workout_user_seq_idx',
            ),
        ),
        migrations.RunPython(backfill_sequence, noop_reverse),
    ]
