"""add event repeats and reminder settings

Revision ID: 8ee7ee5f5df6
Revises: d47e87305027
Create Date: 2026-11-08 16:06:24.359974

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8ee7ee5f5df6'
down_revision = 'd47e87305027'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('repeat_days', sa.JSON(), nullable=False, server_default='[]'))
        batch_op.add_column(sa.Column('repeat_until', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('reminders_enabled', sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column('reminder_tier', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('custom_offsets', sa.JSON(), nullable=False, server_default='[]'))



def downgrade():
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_column('custom_offsets')
        batch_op.drop_column('reminder_tier')
        batch_op.drop_column('reminders_enabled')
        batch_op.drop_column('repeat_until')
        batch_op.drop_column('repeat_days')

