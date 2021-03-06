import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { push } from 'react-router-redux';

import { Input, ModalFormGroup } from 'linode-components';
import { onChange } from 'linode-components';
import { FormModalBody } from 'linode-components';

import { hideModal, showModal } from '~/actions/modal';
import api from '~/api';
import { linodeBackups } from '~/api/ad-hoc/linodes';
import { dispatchOrStoreErrors } from '~/api/util';

import BackupsCheckbox from './BackupsCheckbox';
import BackupSelect from './BackupSelect';
import LinodeSelect from './LinodeSelect';
import PlanSelect from './PlanSelect';


export default class RestoreLinode extends Component {
  static title = 'Create from Backup'

  static trigger(dispatch, linodes, plans) {
    return dispatch(showModal(RestoreLinode.title, (
      <RestoreLinode
        dispatch={dispatch}
        close={() => dispatch(hideModal())}
        linodes={linodes}
        plans={plans}
      />
    )));
  }

  constructor(props) {
    super(props);

    this.state = { errors: {}, allBackups: {}, backups: false };

    this.onChange = onChange.bind(this);
  }

  onLinodeChange = (e) => {
    this.onChange(e);
    this.setState({ fetchingBackups: true }, async () => {
      const linodeId = e.target.value;
      const { allBackups } = this.state;

      if (!allBackups[linodeId]) {
        const backups = await this.props.dispatch(linodeBackups(linodeId));
        this.setState({
          fetchingBackups: false,
          allBackups: { ...allBackups, [linodeId]: backups },
        });
      }
    });
  }

  onSubmit = () => {
    const { dispatch, linodes: allLinodes } = this.props;
    const { linode, label, backup, plan, backups } = this.state;

    const data = {
      label,
      backup_id: backup,
      backups_enabled: backups,
      type: plan,
      region: allLinodes[linode].region,
    };

    return dispatch(dispatchOrStoreErrors.call(this, [
      () => api.linodes.post(data),
      ({ label }) => push(`/linodes/${label}`),
    ]));
  }

  render() {
    const { close, linodes, plans } = this.props;
    const {
      errors, label, linode, plan, backup, backups, allBackups, fetchingBackups,
    } = this.state;

    const linodesWithBackups = _.pickBy(linodes, (l) => l.backups.enabled);
    const linodeBackups = allBackups[linode];

    return (
      <FormModalBody
        onSubmit={this.onSubmit}
        onCancel={close}
        buttonText="Create"
        buttonDisabledText="Creating"
        analytics={{ title: RestoreLinode.title, action: 'add' }}
        errors={errors}
      >
        <div>
          <h3>Restore from (existing Linode)</h3>
          <ModalFormGroup label="Linode" id="linode" apiKey="linode" errors={errors}>
            <LinodeSelect
              linodes={linodesWithBackups}
              value={linode}
              name="linode"
              id="linode"
              onChange={this.onLinodeChange}
            />
            <small className="text-muted">
              Only Linodes with backups enabled and restorable backups available are shown.
            </small>
          </ModalFormGroup>
          <ModalFormGroup label="Backup" id="backup" apiKey="backup" errors={errors}>
            <BackupSelect
              backups={linodeBackups}
              value={backup}
              name="backup"
              id="backup"
              onChange={this.onChange}
              disabled={fetchingBackups}
            />
          </ModalFormGroup>
          <h3>Restore to (new Linode)</h3>
          <ModalFormGroup label="Label" id="label" apiKey="label" errors={errors}>
            <Input
              placeholder="my-linode"
              value={label}
              name="label"
              id="label"
              onChange={this.onChange}
            />
          </ModalFormGroup>
          <ModalFormGroup label="Plan" id="plan" apiKey="type" errors={errors}>
            <PlanSelect
              plans={plans}
              value={plan}
              name="plan"
              id="plan"
              onChange={this.onChange}
            />
          </ModalFormGroup>
          <ModalFormGroup label="Backups" id="backups" apiKey="backups" errors={errors}>
            <BackupsCheckbox
              plans={plans}
              plan={plan}
              checked={backups}
              name="backups"
              id="backups"
              onChange={this.onChange}
            />
          </ModalFormGroup>
        </div>
      </FormModalBody>
    );
  }
}

RestoreLinode.propTypes = {
  dispatch: PropTypes.func.isRequired,
  close: PropTypes.func.isRequired,
  linodes: PropTypes.object.isRequired,
  plans: PropTypes.object.isRequired,
};
