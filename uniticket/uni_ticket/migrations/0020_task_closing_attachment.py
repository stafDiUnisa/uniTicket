# Generated by Django 4.2.9 on 2024-06-06 06:55

from django.db import migrations, models
import uni_ticket.models
import uni_ticket.validators


class Migration(migrations.Migration):

    dependencies = [
        ('uni_ticket', '0019_log_is_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='closing_attachment',
            field=models.FileField(blank=True, max_length=255, null=True, upload_to=uni_ticket.models._attachment_upload, validators=[uni_ticket.validators.validate_file_extension, uni_ticket.validators.validate_file_size, uni_ticket.validators.validate_file_length]),
        ),
    ]
