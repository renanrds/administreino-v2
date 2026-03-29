from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutsession',
            name='average_rpe',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='completed_sets_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='planned_exercises_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='planned_sets_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='total_volume_kg',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='workout_name_snapshot',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='workoutsession',
            name='workout_type_snapshot',
            field=models.CharField(blank=True, choices=[('strength', 'Forca'), ('hypertrophy', 'Hipertrofia'), ('endurance', 'Resistencia'), ('cardio', 'Cardio'), ('hiit', 'HIIT'), ('flexibility', 'Flexibilidade'), ('functional', 'Funcional')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='execution_seconds',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='exercise_name_snapshot',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='muscle_group_snapshot',
            field=models.CharField(blank=True, choices=[('chest', 'Peito'), ('back', 'Costas'), ('shoulders', 'Ombros'), ('biceps', 'Biceps'), ('triceps', 'Triceps'), ('legs', 'Pernas'), ('glutes', 'Gluteos'), ('abs', 'Abdomen'), ('calves', 'Panturrilha'), ('forearms', 'Antebraco'), ('full_body', 'Corpo Inteiro'), ('cardio', 'Cardio')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='planned_reps',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='planned_rest_seconds',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='planned_weight_kg',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='rpe',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='volume_kg',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
